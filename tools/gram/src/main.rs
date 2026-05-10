use clap::{Parser, Subcommand};

mod analyze;
mod dispatch;
mod elements;
mod extension;
mod lint;
mod parse;
mod record_keys;
mod skill;
mod top_level;
pub mod utf16;

#[derive(Parser)]
#[command(name = "gram", version = env!("CARGO_PKG_VERSION"), about = "Unified gram CLI")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Lint .gram files for parse and semantic errors
    Lint(lint::LintArgs),
    /// Validate .gram files for parse and semantic errors (alias for lint)
    #[command(hide = true)]
    Check(lint::LintArgs),
    /// Manage gram extensions
    Extension(extension::ExtensionArgs),
    /// Manage gram agent skills
    Skill(skill::SkillArgs),
    /// Dispatch to an external gram-<name> binary on PATH
    #[command(external_subcommand)]
    External(Vec<String>),
}

fn main() {
    let cli = Cli::parse();
    let code = match cli.command {
        Commands::Lint(args) | Commands::Check(args) => lint::run(args),
        Commands::Extension(args) => extension::run(args),
        Commands::Skill(args) => skill::run(args),
        Commands::External(args) => dispatch::run(&args),
    };
    std::process::exit(code);
}
