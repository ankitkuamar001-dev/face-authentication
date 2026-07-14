# Contributing to This Project

Thank you for your interest in contributing! 🎉

## 🚀 Quick Start for Contributors

1. **Fork** this repository
2. **Clone** your fork: `git clone https://github.com/YOUR_USERNAME/REPO.git`
3. **Create a branch**: `git checkout -b feature/your-feature-name`
4. **Make your changes** following the code style guidelines below
5. **Test** your changes: `make test`
6. **Commit** using [Conventional Commits](https://www.conventionalcommits.org/):
   ```
   feat(scope): add your feature
   fix(scope): fix the bug
   docs: update README
   ```
7. **Push**: `git push origin feature/your-feature-name`
8. **Open a Pull Request** against `main`

## 📋 Code Standards

- **Python**: Follow PEP 8; use `ruff` for linting, `black` for formatting
- **Type hints** required on all public functions and methods
- **Docstrings** for all public classes and functions (Google style)
- **Test coverage** ≥ 80% for any new code added

## 🔧 Development Setup

```bash
# Clone the repo
git clone https://github.com/ankitkuamar001-dev/REPO.git
cd REPO

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt  # dev tools

# Install pre-commit hooks
pre-commit install

# Copy env file
cp .env.example .env
# Edit .env with your credentials

# Run the app
docker compose up -d
```

## 🧪 Running Tests

```bash
# All tests
pytest tests/ -v

# With coverage report
pytest tests/ --cov=src --cov-report=html

# Lint only
ruff check .
```

## 🐛 Reporting Bugs

Use the [Bug Report issue template](.github/ISSUE_TEMPLATE/bug_report.md). Please include:
- Clear description of the bug
- Exact steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Python version, Docker version)
- Relevant logs/screenshots

## 💡 Suggesting Features

Use the [Feature Request issue template](.github/ISSUE_TEMPLATE/feature_request.md).

## 📜 Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## 🔐 Security Issues

**Do NOT open a public issue for security vulnerabilities.**
See [SECURITY.md](SECURITY.md) for responsible disclosure.

## 📄 License

By contributing, you agree your contributions will be licensed under the [MIT License](LICENSE).

---

**Author:** [Ankit Kumar](https://github.com/ankitkuamar001-dev)
