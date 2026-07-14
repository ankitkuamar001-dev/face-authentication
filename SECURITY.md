# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest (`main`) | ✅ Actively maintained |
| Older releases | ❌ Not supported |

## Reporting a Vulnerability

> ⚠️ **Please do NOT open a public GitHub issue for security vulnerabilities.**
> Public disclosure before a fix is available puts all users at risk.

### How to Report

Send a detailed report via email to: **ai.foundation.software@gmail.com**

Please include:
- **Description** — what is the vulnerability and where?
- **Steps to reproduce** — exact steps to trigger the issue
- **Impact** — what can an attacker achieve?
- **Suggested fix** — if you have one (optional but appreciated)
- **Your contact info** — for follow-up questions

### Response Timeline

| Stage | Timeline |
|-------|----------|
| Acknowledgement | Within **48 hours** |
| Status update | Within **7 days** |
| Fix or mitigation plan | Within **14 days** |
| Public disclosure | After fix is released |

We follow responsible disclosure. Reporters will be credited in the release notes unless they prefer anonymity.

## Security Best Practices for Users

When deploying this project:

- **Never commit real credentials** — always use `.env` files (a `.env.example` is provided)
- **Rotate API keys** and secrets regularly
- **Keep dependencies updated**: run `pip-audit` or `safety check` regularly
- **Use Docker secrets** in production instead of environment variables
- **Enable branch protection** on `main` if forking for production use
- **Review all third-party dependencies** before adding them

## Scope

The following are **in scope** for security reports:
- Authentication/authorization bypasses
- Injection vulnerabilities (SQL, command, etc.)
- Sensitive data exposure
- Insecure cryptographic implementations
- Dependency vulnerabilities with direct impact

The following are **out of scope**:
- Issues requiring physical access to a server
- Social engineering attacks
- Vulnerabilities in third-party services (report to them directly)

---

**Maintainer:** [Ankit Kumar](https://github.com/ankitkuamar001-dev)
