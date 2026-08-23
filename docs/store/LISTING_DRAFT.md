# Chrome Web Store listing draft

Status: draft only — not approved for publication.

## Name

OriginLens — See who a site really is

## Short description

Local-first phishing warnings based on claimed identity, sensitive-data intent,
verified domain relationships, and bounded page behavior.

## Detailed description

OriginLens helps inspect whether a page strongly claims a known organization,
requests sensitive data, and uses a domain with independently reviewed positive
identity evidence. Only that explicit conjunction produces the interrupting
phishing warning. Weak URL or behavior facts can produce caution; incomplete
visibility produces unknown. OriginLens never displays a green “safe” verdict.

Analysis is local by default. The optional self-hosted positive identity
resolver is disabled until configured and sends only normalized organization and
locale. OriginLens does not use malicious-domain blocklists or reputation APIs
and is not a replacement for browser protections or phishing-resistant
authentication.

## Draft category and support

- Category: Privacy & Security
- Language: English; warning evidence is language-independent where known
  registry aliases are detected
- Support/security: repository issue tracker for ordinary bugs; private GitHub
  vulnerability reporting for security issues
