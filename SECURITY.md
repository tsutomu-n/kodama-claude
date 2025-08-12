# Security Policy

## Supported Versions

Currently supported versions with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 0.3.x   | :white_check_mark: |
| 0.2.x   | :x:                |
| 0.1.x   | :x:                |

## Reporting a Vulnerability

We take the security of KODAMA Claude seriously. If you discover a security vulnerability, please follow these steps:

### 1. Do NOT Create a Public Issue

Security vulnerabilities should **never** be reported through public GitHub issues, as this could put users at risk.

### 2. Report Privately

Please report vulnerabilities by emailing the maintainers directly or through GitHub's private vulnerability reporting:

1. Go to the [Security tab](https://github.com/tsutomu-n/kodama-claude/security) of the repository
2. Click "Report a vulnerability"
3. Follow the private disclosure process

### 3. What to Include

When reporting a vulnerability, please include:

- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact
- Suggested fix (if any)
- Your contact information for follow-up

### 4. Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Depends on severity
  - Critical: Within 7 days
  - High: Within 14 days
  - Medium: Within 30 days
  - Low: Next regular release

## Security Best Practices for Users

### Installation

Always verify checksums when installing:
```bash
# The installer automatically verifies checksums
curl -fsSL https://github.com/tsutomu-n/kodama-claude/releases/latest/download/install.sh | bash
```

### File Permissions

KODAMA Claude follows strict file permission practices:
- Data directory: `700` (owner only)
- Snapshot files: `600` (owner read/write only)
- No group or world permissions

### API Keys

- Never commit API keys to version control
- Use environment variables for sensitive data
- Keep your Claude API key secure

### Updates

Keep KODAMA Claude updated to receive security patches:
```bash
# Check version
kc --version

# Update to latest
curl -fsSL https://github.com/tsutomu-n/kodama-claude/releases/latest/download/install.sh | bash
```

## Security Features

KODAMA Claude includes several security features:

1. **Path Validation**: Prevents directory traversal attacks
2. **Atomic File Operations**: Prevents data corruption
3. **File Locking**: Prevents race conditions
4. **Secure Permissions**: Restrictive file permissions by default
5. **No Network Access**: KODAMA itself doesn't make network calls (only Claude does)

## Acknowledgments

We appreciate responsible disclosure of security vulnerabilities. Security researchers who report valid issues will be acknowledged in our release notes (with permission).

## Contact

For urgent security matters, you can also reach out through:
- GitHub Security Advisory
- Direct message to maintainers

Thank you for helping keep KODAMA Claude secure!