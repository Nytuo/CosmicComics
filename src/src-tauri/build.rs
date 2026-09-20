use std::{env, fs, path::PathBuf};

fn main() {
    link_native_dependencies_on_android();
    tauri_build::build()
}

/// unrar_sys builds C++ code and gets two things wrong on Android.
///
/// - It asks the linker for `-lpthread` on every non-Windows target. On Android
///   pthread lives in libc and current NDKs no longer ship a `libpthread.a`, so
///   linking fails with "unable to find library -lpthread". An empty archive
///   satisfies the linker.
/// - It turns off the C++ standard library linking (`cpp_link_stdlib(None)`),
///   where cc-rs would default to `c++_shared` on Android. The library would
///   then load with unresolved libc++ symbols. Linking libc++ statically puts
///   it in the app's single native library, so nothing extra is packaged. The
///   NDK splits it in two archives: `c++_static` holds the standard library,
///   `c++abi` holds `operator new`/`delete`, exceptions and `__cxa_*`.
fn link_native_dependencies_on_android() {
    if env::var("CARGO_CFG_TARGET_OS").as_deref() != Ok("android") {
        return;
    }
    let out_dir = PathBuf::from(env::var_os("OUT_DIR").expect("OUT_DIR is set by cargo"));
    fs::write(out_dir.join("libpthread.a"), b"!<arch>\n").expect("write the libpthread.a stub");
    println!("cargo:rustc-link-search=native={}", out_dir.display());
    println!("cargo:rustc-link-lib=c++_static");
    println!("cargo:rustc-link-lib=c++abi");
}
