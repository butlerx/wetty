// build.rs – emits linker flags for the napi .node addon.
//
// Only calls napi_build::setup() when the `node-binding` feature is enabled.
// Plain `cargo test` skips this so Node.js symbols are never required.

fn main() {
    #[cfg(feature = "node-binding")]
    napi_build::setup();
}
