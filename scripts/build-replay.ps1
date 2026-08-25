$ErrorActionPreference = "Stop"
$strawberryPerl = "C:\Strawberry\perl\bin\perl.exe"
if (Test-Path $strawberryPerl) {
  $env:OPENSSL_SRC_PERL = $strawberryPerl
} else {
  $perl = Get-Command perl -ErrorAction SilentlyContinue
  if ($perl) { $env:OPENSSL_SRC_PERL = $perl.Source }
}
cargo +stable-x86_64-pc-windows-msvc build --locked -p repro-replay
