#pragma once

#include <string>
#include <vector>
#include <mutex>
#include <memory>

namespace playapi {
class device_info;
class file_login_cache;
class login_api;
class api;
struct checkin_result;
}

namespace launcher {

// State of a running download, shared with the JS side.
struct download_state {
    std::mutex mutex;
    bool running = false;
    bool done = false;
    bool ok = false;
    double progress = 0;   // 0..1
    double bytes_done = 0; // bytes written so far
    double bytes_total = 0;// total bytes expected
    std::string current;   // file being written right now
    std::string error;
    std::string result;    // JSON summary of the downloaded files
};

// State of a running apk extraction, shared with the JS side.
struct extract_state {
    std::mutex mutex;
    bool running = false;
    bool done = false;
    bool ok = false;
    double progress = 0;   // 0..1
    std::string current;   // entry being extracted
    std::string error;
    std::string result;    // JSON {"dest":...}
};

class play_session {
public:
    play_session();
    ~play_session();

    void setDataDir(const std::string& dir);
    const std::string& dataDir() const { return data_dir_; }

    // Performs the gplaydl-style auth (device checkin, Google login, FDFE api
    // bootstrap incl. TOS). Pass empty email/password to restore a saved token.
    std::string login(const std::string& email, const std::string& password);
    std::string loginWithToken(const std::string& email, const std::string& token);
    std::string loginFromSaved();
    void logout();

    std::string details(const std::string& package);
    std::string appInfo(const std::string& package);
    std::string probeDelivery(const std::string& package);
    std::string extractApk(const std::string& apkPath, const std::string& destDir);
    std::string startExtractApk(const std::string& apkPath, const std::string& destDir,
                                 extract_state* st);

    std::string startDownload(const std::string& package, int versionCode,
                              const std::string& dir, download_state* st);

    bool isReady() const;
    const std::string& userEmail() const { return email_; }

private:
    void init();
    void finishAuth();
    void loadState();
    void saveState();
    void saveAccount();
    void loadAccount();
    std::string statePath(const std::string& name) const;

    std::string data_dir_;
    std::string email_;
    std::string saved_token_;

    std::unique_ptr<playapi::device_info> device_;
    std::unique_ptr<playapi::file_login_cache> login_cache_;
    std::unique_ptr<playapi::login_api> login_;
    std::unique_ptr<playapi::api> api_;
    std::unique_ptr<playapi::checkin_result> checkin_;

    bool ready_ = false;
};

} // namespace launcher