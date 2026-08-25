use {
    anyhow::{bail, Context, Result},
    base64::{engine::general_purpose::STANDARD as BASE64, Engine},
    litesvm::{types::FailedTransactionMetadata, LiteSVM},
    serde::{Deserialize, Serialize},
    solana_account::Account,
    solana_address::Address,
    solana_transaction::versioned::VersionedTransaction,
    std::{
        fs,
        path::{Path, PathBuf},
        str::FromStr,
    },
};

const MAX_INPUT_BYTES: u64 = 25 * 1024 * 1024;
const MAX_ACCOUNTS: usize = 1_000;
const MAX_ACCOUNT_DATA_BYTES: usize = 25 * 1024 * 1024;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TransactionFile {
    raw_base64: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct BundleAccount {
    pubkey: String,
    replay_use: bool,
    pre_state: Option<AccountSnapshot>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AccountSnapshot {
    lamports: u64,
    data_base64: String,
    owner: String,
    executable: bool,
    rent_epoch: u64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ReplayOutput {
    backend: &'static str,
    backend_version: &'static str,
    success: bool,
    error: Option<String>,
    logs: Vec<String>,
    compute_units_consumed: u64,
    return_data: Option<ReturnDataOutput>,
    post_accounts: Vec<PostAccount>,
    assumptions: Vec<&'static str>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ReturnDataOutput {
    program_id: String,
    data_base64: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct PostAccount {
    pubkey: String,
    lamports: u64,
    owner: String,
    executable: bool,
    data_base64: String,
}

fn read_json<T: for<'de> Deserialize<'de>>(path: &Path) -> Result<T> {
    let size = fs::metadata(path)
        .with_context(|| format!("stat {}", path.display()))?
        .len();
    if size > MAX_INPUT_BYTES {
        bail!("input exceeds size limit: {}", path.display());
    }
    serde_json::from_slice(&fs::read(path).with_context(|| format!("read {}", path.display()))?)
        .with_context(|| format!("parse {}", path.display()))
}

fn load_accounts(bundle: &Path) -> Result<Vec<BundleAccount>> {
    let dir = bundle.join("accounts");
    let mut result: Vec<BundleAccount> = Vec::new();
    for entry in fs::read_dir(&dir).with_context(|| format!("read {}", dir.display()))? {
        let path = entry?.path();
        if path.extension().and_then(|value| value.to_str()) == Some("json") {
            result.push(read_json(&path)?);
            if result.len() > MAX_ACCOUNTS {
                bail!("bundle exceeds account limit");
            }
        }
    }
    result.sort_by(|left, right| left.pubkey.cmp(&right.pubkey));
    Ok(result)
}

fn main() -> Result<()> {
    let mut args = std::env::args_os().skip(1);
    let bundle = PathBuf::from(
        args.next()
            .context("usage: repro-replay <bundle-dir> [output.json]")?,
    );
    let output_path = args.next().map(PathBuf::from);
    if args.next().is_some() {
        bail!("too many arguments");
    }

    let transaction: TransactionFile = read_json(&bundle.join("transaction.json"))?;
    let raw = BASE64
        .decode(transaction.raw_base64)
        .context("decode transaction base64")?;
    let tx: VersionedTransaction = wincode::deserialize(&raw).context("deserialize wire transaction")?;
    let accounts = load_accounts(&bundle)?;

    let mut svm = LiteSVM::new()
        .with_mainnet_features()
        .with_sigverify(false)
        .with_blockhash_check(false)
        .with_log_bytes_limit(None);

    for input in accounts.iter().filter(|account| account.replay_use) {
        let Some(snapshot) = &input.pre_state else {
            continue;
        };
        let address = Address::from_str(&input.pubkey)
            .with_context(|| format!("invalid account pubkey {}", input.pubkey))?;
        let owner = Address::from_str(&snapshot.owner)
            .with_context(|| format!("invalid owner {}", snapshot.owner))?;
        let data = BASE64
            .decode(&snapshot.data_base64)
            .context("decode account data")?;
        if data.len() > MAX_ACCOUNT_DATA_BYTES {
            bail!("account data exceeds size limit: {}", input.pubkey);
        }
        svm.set_account(
            address,
            Account {
                lamports: snapshot.lamports,
                data,
                owner,
                executable: snapshot.executable,
                rent_epoch: snapshot.rent_epoch,
            },
        )?;
    }

    let result = svm.send_transaction(tx);
    let (success, error, metadata) = match result {
        Ok(metadata) => (true, None, metadata),
        Err(failure) => {
            let error = format!("{:?}", failure.err);
            let FailedTransactionMetadata { meta, .. } = failure;
            (false, Some(error), meta)
        }
    };

    let post_accounts = accounts
        .iter()
        .filter_map(|input| {
            let address = Address::from_str(&input.pubkey).ok()?;
            let account = svm.get_account(&address)?;
            Some(PostAccount {
                pubkey: input.pubkey.clone(),
                lamports: account.lamports,
                owner: account.owner.to_string(),
                executable: account.executable,
                data_base64: BASE64.encode(&account.data),
            })
        })
        .collect();

    let return_data = (!metadata.return_data.data.is_empty()).then(|| ReturnDataOutput {
        program_id: metadata.return_data.program_id.to_string(),
        data_base64: BASE64.encode(&metadata.return_data.data),
    });
    let output = ReplayOutput {
        backend: "litesvm-rust",
        backend_version: "0.15.2",
        success,
        error,
        logs: metadata.logs,
        compute_units_consumed: metadata.compute_units_consumed,
        return_data,
        post_accounts,
        assumptions: vec![
            "signature verification disabled because the original signed message is retained",
            "blockhash age checking disabled because the original blockhash is historical",
            "LiteSVM mainnet feature list is compiled into the selected backend version",
        ],
    };
    let json = serde_json::to_string_pretty(&output)? + "\n";
    if let Some(path) = output_path {
        fs::write(&path, &json).with_context(|| format!("write {}", path.display()))?;
    }
    print!("{json}");
    Ok(())
}
