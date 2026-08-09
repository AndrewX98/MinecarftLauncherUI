/* ============================================================
   launcher.node - N-API binding for mcpelauncher C++ libraries
   Links: libgplayapi.a  (Google Play login / checkin / download)
          libmcpelauncher-common.a (path helpers)
   ============================================================ */
#include <node_api.h>

#include <string>
#include <future>
#include <iomanip>
#include <exception>
#include <memory>

#include <mcpelauncher/path_helper.h>
#include <playapi/device_info.h>
#include <playapi/checkin.h>
#include "play_api.h"

#define NODE_API_CALL(env, call)                                              \
  do {                                                                        \
    napi_status status = (call);                                              \
    if (status != napi_ok) {                                                  \
      napi_throw_error((env), nullptr, "N-API call failed");                  \
      return nullptr;                                                         \
    }                                                                         \
  } while (0)

namespace {

std::string JsonEscape(const std::string& in) {
  std::ostringstream out;
  for (char c : in) {
    switch (c) {
      case '"': out << "\\\""; break;
      case '\\': out << "\\\\"; break;
      case '\n': out << "\\n"; break;
      case '\r': out << "\\r"; break;
      case '\t': out << "\\t"; break;
      case '\b': out << "\\b"; break;
      case '\f': out << "\\f"; break;
      default:
        if ((unsigned char)c < 0x20) {
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

napi_value MakeString(napi_env env, const std::string& str) {
  napi_value out;
  if (napi_create_string_utf8(env, str.c_str(), str.size(), &out) != napi_ok)
    return nullptr;
  return out;
}

std::string GetStringArg(napi_env env, napi_value arg) {
  size_t len = 0;
  if (napi_get_value_string_utf8(env, arg, nullptr, 0, &len) != napi_ok)
    return "";
  std::string s(len, '\0');
  size_t written = 0;
  if (napi_get_value_string_utf8(env, arg, &s[0], len + 1, &written) != napi_ok)
    return "";
  s.resize(written);
  return s;
}

// ---- path helpers (libmcpelauncher-common) ----

napi_value GetDataDir(napi_env env, napi_callback_info info) {
  return MakeString(env, PathHelper::getPrimaryDataDirectory());
}

napi_value GetCacheDir(napi_env env, napi_callback_info info) {
  return MakeString(env, PathHelper::getCacheDirectory());
}

napi_value GetGameDir(napi_env env, napi_callback_info info) {
  return MakeString(env, PathHelper::getGameDir());
}

napi_value GetAbi(napi_env env, napi_callback_info info) {
  const char* abi = PathHelper::getAbiDir();
  return MakeString(env, abi ? abi : "unknown");
}

napi_value SetDataDir(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value argv[1];
  napi_get_cb_info(env, info, &argc, argv, nullptr, nullptr);
  if (argc < 1)
    return nullptr;
  std::string dir = GetStringArg(env, argv[0]);
  PathHelper::setDataDir(dir);
  return MakeString(env, PathHelper::getPrimaryDataDirectory());
}

napi_value FileExists(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value argv[1];
  napi_get_cb_info(env, info, &argc, argv, nullptr, nullptr);
  napi_value out;
  bool exists = argc >= 1 && PathHelper::fileExists(GetStringArg(env, argv[0]));
  napi_get_boolean(env, exists, &out);
  return out;
}

// ---- checkin (libgplayapi) ----

napi_value Checkin(napi_env env, napi_callback_info info) {
  std::promise<std::string> promise;
  auto fut = promise.get_future();

  playapi::device_info device;
  playapi::checkin_api checkin(device);

  auto task = checkin.perform_anonymous_checkin();
  task->call(
      [&promise](playapi::checkin_result&& res) {
          std::string out = "androidId=0x" + res.get_string_android_id();
          if (res.android_id != 0)
            out += "\nsecurityToken=" + std::to_string(res.security_token) + "\ntime=" +
                   std::to_string(res.time);
          promise.set_value(out);
        },
        [&promise](std::exception_ptr err) {
          std::string msg = "checkin failed: ";
          try {
            std::rethrow_exception(err);
          } catch (std::exception& e) {
            msg += e.what();
          } catch (...) {
            msg += "unknown error";
          }
          promise.set_value(msg);
        });

  fut.wait();
  return MakeString(env, fut.get());
}

// ---- Google Play login / app info / download (play_api) ----

launcher::play_session& Session() {
  static launcher::play_session session;
  return session;
}

launcher::download_state& Download() {
  static launcher::download_state st;
  return st;
}

launcher::extract_state& Extract() {
  static launcher::extract_state st;
  return st;
}

napi_value EnsureSessionDataDir(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value argv[1];
  napi_get_cb_info(env, info, &argc, argv, nullptr, nullptr);
  if (argc >= 1)
    Session().setDataDir(GetStringArg(env, argv[0]));
  return MakeString(env, Session().dataDir());
}

napi_value PlayLogin(napi_env env, napi_callback_info info) {
  size_t argc = 2;
  napi_value argv[2];
  napi_get_cb_info(env, info, &argc, argv, nullptr, nullptr);
  std::string email = argc >= 1 ? GetStringArg(env, argv[0]) : "";
  std::string password = argc >= 2 ? GetStringArg(env, argv[1]) : "";
  try {
    return MakeString(env, Session().login(email, password));
  } catch (std::exception& e) {
    return MakeString(env, std::string("{\"error\":\"") + JsonEscape(e.what()) + "\"}");
  }
}

napi_value PlayLoginToken(napi_env env, napi_callback_info info) {
  size_t argc = 2;
  napi_value argv[2];
  napi_get_cb_info(env, info, &argc, argv, nullptr, nullptr);
  std::string email = argc >= 1 ? GetStringArg(env, argv[0]) : "";
  std::string token = argc >= 2 ? GetStringArg(env, argv[1]) : "";
  try {
    return MakeString(env, Session().loginWithToken(email, token));
  } catch (std::exception& e) {
    return MakeString(env, std::string("{\"error\":\"") + e.what() + "\"}");
  }
}

napi_value PlayLogout(napi_env env, napi_callback_info info) {
  Session().logout();
  return MakeString(env, "ok");
}

napi_value PlayDetails(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value argv[1];
  napi_get_cb_info(env, info, &argc, argv, nullptr, nullptr);
  std::string pkg = argc >= 1 ? GetStringArg(env, argv[0]) : "";
  return MakeString(env, Session().details(pkg));
}

napi_value PlayAppInfo(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value argv[1];
  napi_get_cb_info(env, info, &argc, argv, nullptr, nullptr);
  std::string pkg = argc >= 1 ? GetStringArg(env, argv[0]) : "";
  return MakeString(env, Session().appInfo(pkg));
}

napi_value PlayDownloadStart(napi_env env, napi_callback_info info) {
  size_t argc = 3;
  napi_value argv[3];
  napi_get_cb_info(env, info, &argc, argv, nullptr, nullptr);
  std::string pkg = argc >= 1 ? GetStringArg(env, argv[0]) : "";
  int vc = 0;
  if (argc >= 2) {
    int32_t v = 0;
    napi_get_value_int32(env, argv[1], &v);
    vc = v;
  }
  std::string dir = argc >= 3 ? GetStringArg(env, argv[2]) : PathHelper::getPrimaryDataDirectory();
  return MakeString(env, Session().startDownload(pkg, vc, dir, &Download()));
}

napi_value PlayDownloadStatus(napi_env env, napi_callback_info info) {
  auto& st = Download();
  std::lock_guard<std::mutex> l(st.mutex);
  std::ostringstream ss;
  ss << "{"
     << "\"running\":" << (st.running ? "true" : "false")
     << ",\"done\":" << (st.done ? "true" : "false")
     << ",\"ok\":" << (st.ok ? "true" : "false")
     << ",\"progress\":" << st.progress
     << ",\"bytesDone\":" << std::fixed << std::setprecision(0) << st.bytes_done
     << ",\"bytesTotal\":" << std::fixed << std::setprecision(0) << st.bytes_total
     << ",\"current\":\"" << JsonEscape(st.current) << "\""
     << ",\"error\":\"" << JsonEscape(st.error) << "\""
     << ",\"result\":" << (st.result.empty() ? "null" : st.result)
     << "}";
  return MakeString(env, ss.str());
}

napi_value ProbeDelivery(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value argv[1];
  napi_get_cb_info(env, info, &argc, argv, nullptr, nullptr);
  std::string pkg = argc >= 1 ? GetStringArg(env, argv[0]) : "";
  return MakeString(env, Session().probeDelivery(pkg));
}

napi_value ExtractApk(napi_env env, napi_callback_info info) {
  size_t argc = 2;
  napi_value argv[2];
  napi_get_cb_info(env, info, &argc, argv, nullptr, nullptr);
  std::string apkPath = argc >= 1 ? GetStringArg(env, argv[0]) : "";
  std::string destDir = argc >= 2 ? GetStringArg(env, argv[1]) : "";
  return MakeString(env, Session().startExtractApk(apkPath, destDir, &Extract()));
}

napi_value ExtractStatus(napi_env env, napi_callback_info info) {
  auto& st = Extract();
  std::lock_guard<std::mutex> l(st.mutex);
  std::ostringstream ss;
  ss << "{"
     << "\"running\":" << (st.running ? "true" : "false")
     << ",\"done\":" << (st.done ? "true" : "false")
     << ",\"ok\":" << (st.ok ? "true" : "false")
     << ",\"progress\":" << st.progress
     << ",\"current\":\"" << JsonEscape(st.current) << "\""
     << ",\"error\":\"" << JsonEscape(st.error) << "\""
     << ",\"result\":" << (st.result.empty() ? "null" : st.result)
     << "}";
  return MakeString(env, ss.str());
}

}  // namespace

NAPI_MODULE_INIT() {
  napi_value fn;

  napi_create_function(env, "getDataDir", NAPI_AUTO_LENGTH, GetDataDir, nullptr, &fn);
  napi_set_named_property(env, exports, "getDataDir", fn);

  napi_create_function(env, "getCacheDir", NAPI_AUTO_LENGTH, GetCacheDir, nullptr, &fn);
  napi_set_named_property(env, exports, "getCacheDir", fn);

  napi_create_function(env, "getGameDir", NAPI_AUTO_LENGTH, GetGameDir, nullptr, &fn);
  napi_set_named_property(env, exports, "getGameDir", fn);

  napi_create_function(env, "getAbi", NAPI_AUTO_LENGTH, GetAbi, nullptr, &fn);
  napi_set_named_property(env, exports, "getAbi", fn);

  napi_create_function(env, "setDataDir", NAPI_AUTO_LENGTH, SetDataDir, nullptr, &fn);
  napi_set_named_property(env, exports, "setDataDir", fn);

  napi_create_function(env, "fileExists", NAPI_AUTO_LENGTH, FileExists, nullptr, &fn);
  napi_set_named_property(env, exports, "fileExists", fn);

  napi_create_function(env, "checkin", NAPI_AUTO_LENGTH, Checkin, nullptr, &fn);
  napi_set_named_property(env, exports, "checkin", fn);

  napi_create_function(env, "playSetDataDir", NAPI_AUTO_LENGTH, EnsureSessionDataDir, nullptr, &fn);
  napi_set_named_property(env, exports, "playSetDataDir", fn);

  napi_create_function(env, "login", NAPI_AUTO_LENGTH, PlayLogin, nullptr, &fn);
  napi_set_named_property(env, exports, "login", fn);

  napi_create_function(env, "loginWithToken", NAPI_AUTO_LENGTH, PlayLoginToken, nullptr, &fn);
  napi_set_named_property(env, exports, "loginWithToken", fn);

  napi_create_function(env, "logout", NAPI_AUTO_LENGTH, PlayLogout, nullptr, &fn);
  napi_set_named_property(env, exports, "logout", fn);

  napi_create_function(env, "details", NAPI_AUTO_LENGTH, PlayDetails, nullptr, &fn);
  napi_set_named_property(env, exports, "details", fn);

  napi_create_function(env, "appInfo", NAPI_AUTO_LENGTH, PlayAppInfo, nullptr, &fn);
  napi_set_named_property(env, exports, "appInfo", fn);

  napi_create_function(env, "downloadStart", NAPI_AUTO_LENGTH, PlayDownloadStart, nullptr, &fn);
  napi_set_named_property(env, exports, "downloadStart", fn);

  napi_create_function(env, "probeDelivery", NAPI_AUTO_LENGTH, ProbeDelivery, nullptr, &fn);
  napi_set_named_property(env, exports, "probeDelivery", fn);
  napi_create_function(env, "downloadStatus", NAPI_AUTO_LENGTH, PlayDownloadStatus, nullptr, &fn);
  napi_set_named_property(env, exports, "downloadStatus", fn);

  napi_create_function(env, "extractApk", NAPI_AUTO_LENGTH, ExtractApk, nullptr, &fn);
  napi_set_named_property(env, exports, "extractApk", fn);

  napi_create_function(env, "extractStatus", NAPI_AUTO_LENGTH, ExtractStatus, nullptr, &fn);
  napi_set_named_property(env, exports, "extractStatus", fn);

  return exports;
}