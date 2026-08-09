#include "play_api.h"

#include <fstream>
#include <sstream>
#include <thread>
#include <cstdio>

#include <curl/curl.h>

#include <playapi/device_info.h>
#include <mcpelauncher/zip_extractor.h>
#include <playapi/checkin.h>
#include <playapi/login.h>
#include <playapi/file_login_cache.h>
#include <playapi/api.h>
#include <playapi/util/config.h>

using namespace playapi;
using namespace launcher;

namespace {
std::string path_join(const std::string& a, const std::string& b) {
    if (a.empty())
        return b;
    if (a.back() == '/')
        return a + b;
    return a + "/" + b;
}

std::string json_escape(const std::string& in) {
    std::ostringstream out;
    for (char c : in) {
        switch (c) {
            case '"':  out << "\\\""; break;
            case '\\': out << "\\\\"; break;
            case '\n': out << "\\n"; break;
            case '\r': out << "\\r"; break;
            case '\t': out << "\\t"; break;
            case '\b': out << "\\b"; break;
            case '\f': out << "\\f"; break;
            default:
                if (c < 0x20) {
                    char buf[8];
                    std::snprintf(buf, sizeof(buf), "\\u%04x", c);
                    out << buf;
                } else {
                    out << c;
                }
        }
    }
    return out.str();
}
} // namespace

play_session::play_session() {
    curl_global_init(CURL_GLOBAL_ALL);
}

play_session::~play_session() {
    curl_global_cleanup();
}

void play_session::setDataDir(const std::string& dir) {
    data_dir_ = dir;
}

std::string play_session::statePath(const std::string& name) const {
    return path_join(data_dir_, name);
}

// ---------------------------------------------------------------
// init

void play_session::init() {
    if (device_)
        return;
    device_.reset(new device_info());
    device_->config_native_platforms = {"x86_64", "x86", "armeabi-v7a", "armeabi", "arm64-v8a"};
    // Identify as a ChromeOS device so Google Play offers Chromebook/ChromeOS apps
    // (this is how mcpelauncher's "ChromeOS mode" gets Minecraft delivery data).
    device_->config_system_features.clear();
    const char* chrome_features[] = {
        "android.hardware.faketouch", "android.software.backup", "org.chromium.arc.device_management",
        "android.software.print", "android.software.activities_on_secondary_displays",
        "com.google.android.feature.PIXEL_2017_EXPERIENCE", "android.software.voice_recognizers",
        "android.software.picture_in_picture", "android.software.cant_save_state",
        "com.google.android.feature.PIXEL_2018_EXPERIENCE", "android.hardware.opengles.aep",
        "android.hardware.type.pc", "android.hardware.bluetooth", "com.google.android.feature.GOOGLE_BUILD",
        "org.chromium.arc", "android.hardware.audio.output", "android.software.verified_boot",
        "android.hardware.camera.front", "android.hardware.screen.portrait",
        "com.google.android.feature.TURBO_PRELOAD", "android.hardware.microphone",
        "android.software.autofill", "com.google.android.feature.PIXEL_EXPERIENCE",
        "android.hardware.bluetooth_le", "android.software.input_methods",
        "android.software.companion_device_setup", "com.google.android.feature.WELLBEING",
        "android.hardware.wifi.passpoint", "android.hardware.screen.landscape",
        "android.hardware.ram.normal", "android.software.webview", "android.hardware.camera.any",
        "android.hardware.location.network", "android.software.cts",
        "com.google.android.apps.dialer.SUPPORTED", "com.google.android.feature.GOOGLE_EXPERIENCE",
        "com.google.android.feature.EXCHANGE_6_2", "android.software.freeform_window_management",
        "android.software.midi", "android.hardware.wifi", "android.hardware.location",
        "org.chromium.arc.video_encode_dynamic_bitrate"};
    for (auto&& f : chrome_features)
        device_->config_system_features.push_back({f, 0});
    const char* chrome_sharedlibs[] = {
        "android.test.base", "android.test.mock", "com.google.android.chromeos",
        "com.google.android.media.effects", "org.chromium.arc.bridge", "org.chromium.arc",
        "com.android.location.provider", "android.ext.shared", "javax.obex", "com.google.android.gms",
        "android.ext.services", "android.test.runner", "org.chromium.arc.mojom",
        "com.google.android.dialer.support", "com.google.android.maps", "org.apache.http.legacy",
        "com.android.media.remotedisplay", "com.android.mediadrm.signer"};
    device_->config_system_shared_libraries.clear();
    for (auto&& l : chrome_sharedlibs)
        device_->config_system_shared_libraries.push_back(l);
    device_->generate_fields();
    login_cache_.reset(new file_login_cache(statePath("gplay.tokens")));
    login_.reset(new login_api(*device_, *login_cache_));
    api_.reset(new api(*device_));
    checkin_.reset(new checkin_result());
    loadState();
}

bool play_session::isReady() const {
    return ready_;
}

// ---------------------------------------------------------------
// state persistence (checkin + api data per account)
// ---------------------------------------------------------------

void play_session::saveState() {
    if (data_dir_.empty())
        return;

    config conf;
    std::string p = "api." + (email_.empty() ? "default" : email_) + ".";

    if (api_) {
        std::lock_guard<std::mutex> l(api_->info_mutex);
        conf.set(p + "toc_cookie", api_->toc_cookie);
        conf.set(p + "device_config_token", api_->device_config_token);
        conf.set(p + "experiments", api_->experiments.get_comma_separated_target_list());
    }
    if (checkin_) {
        conf.set_long("checkin.time", checkin_->time);
        conf.set_long("checkin.android_id", (long long) checkin_->android_id);
        conf.set_long("checkin.security_token", (long long) checkin_->security_token);
        conf.set("checkin.device_data_version_info", checkin_->device_data_version_info);
    }
    std::ofstream out(statePath("gplay.state"));
    conf.save(out);
}

void play_session::loadState() {
    config conf;
    std::ifstream in(statePath("gplay.state"));
    if (in.good())
        conf.load(in);

    if (checkin_ && !checkin_->get_string_android_id().empty()) {
        // already have checkin data for a previous session
    }
    if (checkin_) {
        checkin_->time = conf.get_long("checkin.time", checkin_->time);
        checkin_->android_id = (unsigned long long) conf.get_long("checkin.android_id", (long long) checkin_->android_id);
        checkin_->security_token = (unsigned long long) conf.get_long("checkin.security_token", (long long) checkin_->security_token);
        checkin_->device_data_version_info = conf.get("checkin.device_data_version_info", checkin_->device_data_version_info);
    }

    if (email_.empty())
        return;
    std::string p = "api." + email_ + ".";
    if (api_) {
        std::lock_guard<std::mutex> l(api_->info_mutex);
        api_->toc_cookie = conf.get(p + "toc_cookie", api_->toc_cookie);
        api_->device_config_token = conf.get(p + "device_config_token", api_->device_config_token);
        api_->experiments.set_targets(conf.get(p + "experiments"));
    }
}

void play_session::saveAccount() {
    if (email_.empty())
        return;
    std::ofstream out(statePath("gplay.account"));
    out << "email = " << email_ << "\n"
        << "token = " << (login_ ? login_->get_token() : "") << "\n";
}

void play_session::loadAccount() {
    std::ifstream in(statePath("gplay.account"));
    if (!in.good())
        return;
    config conf;
    conf.load(in);
    email_ = conf.get("email");
    saved_token_ = conf.get("token");
}

// Shared post-auth setup: get a device android id, authenticate the FDFE api
// and bootstrap the required toc/device-config data.
void play_session::finishAuth() {
    // ensure we have a real checkin (with auth) for the fdfe api
    if (checkin_->android_id == 0) {
        checkin_api ck(*device_);
        login_->set_checkin_data(*checkin_);
        ck.add_auth(*login_)->call();
        *checkin_ = ck.perform_checkin()->call();
        saveState();
    }

    // set up the authenticated FDFE api
    api_->set_checkin_data(*checkin_);
    api_->set_auth(*login_)->call();

    // restore previous api data (toc cookie, device config token)
    std::string p = "api." + email_ + ".";
    {
        config conf;
        std::ifstream in(statePath("gplay.state"));
        if (in.good())
            conf.load(in);
        std::lock_guard<std::mutex> l(api_->info_mutex);
        api_->toc_cookie = conf.get(p + "toc_cookie", api_->toc_cookie);
        api_->device_config_token = conf.get(p + "device_config_token", api_->device_config_token);
        api_->experiments.set_targets(conf.get(p + "experiments"));
    }

    if (api_->toc_cookie.empty() || api_->device_config_token.empty()) {
        api_->fetch_user_settings()->call();
        auto toc = api_->fetch_toc()->call();
        if (toc.payload().tocresponse().has_cookie())
            api_->set_toc_cookie(toc.payload().tocresponse().cookie());

        if (api_->fetch_toc()->call().payload().tocresponse().requiresuploaddeviceconfig()) {
            auto resp = api_->upload_device_config()->call();
            api_->set_device_config_token(resp.payload().uploaddeviceconfigresponse().uploaddeviceconfigtoken());
            auto toc2 = api_->fetch_toc()->call();
            if (toc2.payload().tocresponse().has_cookie())
                api_->set_toc_cookie(toc2.payload().tocresponse().cookie());
        }
    }

    ready_ = true;
    saveState();
}

// ---------------------------------------------------------------
// login (follows gplaydl perform_auth)
// ---------------------------------------------------------------

std::string play_session::login(const std::string& email, const std::string& password) {
    init();
    try {
        if (!email.empty()) {
            // fresh password login on a (possibly) new device
            login_->perform(email, password)->call();
            email_ = email;
            saveAccount();
        } else {
            loadAccount();
            if (email_.empty() || saved_token_.empty())
                return R"({"error":"no-saved-login"})";
            login_->set_token(email_, saved_token_);
            login_->verify()->call();
        }

        email_ = login_->get_email().empty() ? email_ : login_->get_email();
        finishAuth();
        ready_ = true;
        std::ostringstream ss;
        ss << R"({"ok":true,"email":")" << json_escape(email_) << R"("})";
        return ss.str();
    } catch (std::exception& e) {
        return std::string("{\"error\":\"") + json_escape(e.what()) + "\"}";
    }
}

std::string play_session::loginWithToken(const std::string& email, const std::string& token) {
    init();
    try {
        email_ = email;
        // Exchange the webview oauth access token for an auth token/cookie.
        login_->perform_with_access_token(token, email_, true)->call();

        email_ = login_->get_email().empty() ? email_ : login_->get_email();
        finishAuth();
        saveAccount();
        return std::string("{\"ok\":true,\"email\":\"") + json_escape(email_) + "\"}";
    } catch (std::exception& e) {
        return std::string("{\"error\":\"") + json_escape(e.what()) + "\"}";
    }
}

std::string play_session::loginFromSaved() {
    return login("", "");
}

void play_session::logout() {
    ready_ = false;
    email_.clear();
    saved_token_.clear();
    if (login_cache_)
        login_cache_->clear();
    checkin_.reset(new checkin_result());
    std::remove(statePath("gplay.account").c_str());
}

// ---------------------------------------------------------------
// info queries

std::string play_session::details(const std::string& package) {
    if (!ready_)
        return R"({"error":"not-logged-in"})";
    try {
        auto resp = api_->details(package)->call().payload().detailsresponse().docv2();
        auto& app = resp.details().appdetails();
        if (!app.has_versioncode())
            return R"({"error":"no-version"})";
        std::ostringstream ss;
        ss << R"({"version":")" << json_escape(app.versionstring()) << R"(","versionCode":)" << app.versioncode();
        if (app.has_recentchangeshtml())
            ss << R"(,"changelog":")" << json_escape(app.recentchangeshtml()) << "\"";
        ss << "}";
        return ss.str();
    } catch (std::exception& e) {
        return std::string("{\"error\":\"") + json_escape(e.what()) + "\"}";
    }
}

std::string play_session::appInfo(const std::string& package) {
    if (!ready_)
        return R"({"error":"not-logged-in"})";
    try {
        auto resp = api_->details(package)->call().payload().detailsresponse().docv2();
        auto& app = resp.details().appdetails();
        std::ostringstream ss;
        ss << R"({"package":")" << json_escape(package) << R"(","version":")" << json_escape(app.versionstring())
           << R"(","versionCode":)" << app.versioncode()
           << R"(,"isBeta":)" << (app.testingprograminfo().subscribed() ? "true" : "false")
           << R"(,"changelog":")" << json_escape(app.recentchangeshtml()) << "\"}";
        return ss.str();
    } catch (std::exception& e) {
        return std::string("{\"error\":\"") + json_escape(e.what()) + "\"}";
    }
}

// ---------------------------------------------------------------
// download

std::string play_session::probeDelivery(const std::string& package) {
    if (!ready_)
        return R"({"error":"not-logged-in"})";
    try {
        int vc = api_->details(package)->call().payload().detailsresponse().docv2()
                     .details().appdetails().versioncode();
        auto resp = api_->delivery(package, vc, std::string())->call().payload().deliveryresponse();
        auto dd = resp.appdeliverydata();
        return "{\"status\":" + std::to_string(resp.has_status() ? resp.status() : 0) +
               ",\"cookies\":" + std::to_string(dd.downloadauthcookie_size()) +
               ",\"splits\":" + std::to_string(dd.splitdeliverydata_size()) +
               ",\"has_dd\":" + (dd.has_downloadurl() || dd.has_gzippeddownloadurl() ? "true" : "false") +
               "}";
    } catch (std::exception& e) {
        return std::string("{\"error\":\"") + json_escape(e.what()) + "\"}";
    }
}

// ---------------------------------------------------------------
// apk extraction

std::string play_session::extractApk(const std::string& apkPath, const std::string& destDir) {
    try {
        ZipExtractor extractor(apkPath);
        std::string dest = destDir.empty() ? apkPath + ".unpacked" : destDir;
        if (!dest.empty() && dest.back() != '/')
            dest += "/";
        size_t count = 0;
        extractor.extractTo(
            [&](const char* name, std::string& outName) {
                std::string n = name;
                if (!n.empty() && n.back() == '/')
                    return false;  // skip zip directory entries
                outName = dest + name;
                return true;
            },
            [&](size_t, size_t, ZipExtractor::FileHandle const&, size_t, size_t) {
                count++;
            });
        return "{\"ok\":true,\"files\":" + std::to_string(count) + ",\"dest\":\"" +
               json_escape(dest) + "\"}";
    } catch (std::exception& e) {
        return std::string("{\"error\":\"") + json_escape(e.what()) + "\"}";
    }
}

std::string play_session::startExtractApk(const std::string& apkPath, const std::string& destDir,
                                           extract_state* st) {
    {
        std::lock_guard<std::mutex> l(st->mutex);
        st->running = true;
        st->done = false;
        st->ok = false;
        st->progress = 0;
        st->current.clear();
        st->error.clear();
        st->result.clear();
    }
    std::thread([st, apkPath, destDir]() {
        try {
            ZipExtractor extractor(apkPath);
            std::string dest = destDir.empty() ? apkPath + ".unpacked" : destDir;
            if (!dest.empty() && dest.back() != '/')
                dest += "/";
            auto entries = extractor.listEntries(
                [&](const char* name, std::string& outName) {
                    std::string n = name;
                    if (!n.empty() && n.back() == '/')
                        return false;  // skip zip directory entries
                    outName = dest + name;
                    return true;
                });
            size_t total = entries.size();
            size_t count = 0;
            extractor.extractEntries(entries,
                [&](size_t current, size_t, ZipExtractor::FileHandle const&, size_t, size_t) {
                    std::string n;
                    if (count < entries.size())
                        n = entries[count].zipName;
                    std::lock_guard<std::mutex> l(st->mutex);
                    st->progress = total ? (double) current / total : 0;
                    st->current = n;
                    count++;
                });
            std::string result = "{\"dest\":\"" + json_escape(dest) + "\",\"files\":" +
                                std::to_string(count) + "}";
            {
                std::lock_guard<std::mutex> l(st->mutex);
                st->ok = true;
                st->done = true;
                st->progress = 1;
                st->result = result;
            }
        } catch (std::exception& e) {
            std::lock_guard<std::mutex> l(st->mutex);
            st->ok = false;
            st->done = true;
            st->error = e.what();
        }
        {
            std::lock_guard<std::mutex> l(st->mutex);
            st->running = false;
        }
    }).detach();
    return R"({"state":"started"})";
}

std::string play_session::startDownload(const std::string& package, int versionCode,
                                        const std::string& dir, download_state* st) {
    if (!ready_)
        return R"({"error":"not-logged-in"})";

    {
        std::lock_guard<std::mutex> l(st->mutex);
        st->running = true;
        st->done = false;
        st->ok = false;
        st->progress = 0;
        st->bytes_done = 0;
        st->bytes_total = 0;
        st->current.clear();
        st->error.clear();
    }

    std::thread([st, package, versionCode, dir, this]() {
        std::string out;
        try {
            int vc = versionCode;
            if (vc <= 0) {
                auto d = api_->details(package)->call().payload().detailsresponse().docv2();
                vc = d.details().appdetails().versioncode();
            }

            auto resp = api_->delivery(package, vc, std::string())->call().payload()
                            .deliveryresponse();
            const auto& dd = resp.appdeliverydata();

            auto mainUrl = dd.has_gzippeddownloadurl() ? dd.gzippeddownloadurl() : dd.downloadurl();
            if (mainUrl.empty())
                throw std::runtime_error(
                    "No download available. The app may not be available on Google Play for the "
                    "logged-in account, or a library/purchase token is required.");

            auto cookieName = std::string();
            auto cookieValue = std::string();
            if (dd.downloadauthcookie_size() > 0) {
                const auto& c = dd.downloadauthcookie(0);
                cookieName = c.name();
                cookieValue = c.value();
            }

            double total = 0;
            if (dd.has_downloadsize())
                total += dd.downloadsize();
            for (auto&& s : dd.splitdeliverydata())
                total += s.has_downloadsize() ? (double) s.downloadsize() : 0;
            {
                std::lock_guard<std::mutex> l(st->mutex);
                st->bytes_total = total;
            }
            double done = 0;

            auto download = [&](const std::string& url, const std::string& outpath) {
                http_request req(url);
                req.set_user_agent("AndroidDownloadManager/" + device_->build_version_string +
                                   " (Linux; U; Android " + device_->build_version_string + "; " +
                                   device_->build_model + " Build/" + device_->build_id + ")");
                req.set_follow_location(true);
                req.set_timeout(0L);
                if (!cookieName.empty())
                    req.add_header("Cookie", cookieName + "=" + cookieValue);
                req.set_custom_output_func([&](char* data, size_t size) {
                    FILE* f = fopen(outpath.c_str(), "ab");
                    if (!f)
                        throw std::runtime_error("cannot write " + outpath);
                    fwrite(data, 1, size, f);
                    fclose(f);
                    done += size;
                    std::lock_guard<std::mutex> l(st->mutex);
                    st->bytes_done = done;
                    st->progress = total > 0 ? done / total : 0;
                    return size;
                });
                req.perform();
            };

            std::string base = path_join(dir, package + "." + std::to_string(vc));
            std::vector<std::string> files;
            std::string mainFile = base + ".apk";
            download(mainUrl, mainFile);
            files.push_back(mainFile);

            for (auto&& s : dd.splitdeliverydata()) {
                std::string u = s.has_gzippeddownloadurl() ? s.gzippeddownloadurl() : s.downloadurl();
                std::string f = base + "." + s.id() + ".apk";
                download(u, f);
                files.push_back(f);
            }

            std::ostringstream ss;
            ss << R"({"versionCode":)" << vc << R"(,"files":[)";
            for (size_t i = 0; i < files.size(); i++) {
                if (i)
                    ss << ",";
                ss << "\"" << json_escape(files[i]) << "\"";
            }
            ss << "]}";
            out = ss.str();

            std::lock_guard<std::mutex> l(st->mutex);
            st->ok = true;
            st->done = true;
            st->result = out;
            st->progress = 1;
        } catch (std::exception& e) {
            std::lock_guard<std::mutex> l(st->mutex);
            st->ok = false;
            st->done = true;
            st->result.clear();
            st->error = e.what();
        }
        std::lock_guard<std::mutex> l(st->mutex);
        st->running = false;
    }).detach();

    return R"({"state":"started"})";
}