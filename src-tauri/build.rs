fn main() {
    if let Err(e) = tauri_build::try_build(tauri_build::Attributes::new()) {
        println!("cargo:warning=TAURI_BUILD_ERROR: {}", e);
        panic!("tauri_build failed: {}", e);
    }
}
