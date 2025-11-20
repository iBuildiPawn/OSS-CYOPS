# CYOPS MCP Server Documentation

Welcome to the CYOPS MCP Server documentation. This directory contains comprehensive guides for using all tools and features.

## 📚 Documentation Index

### Quick Start
- **[../README.md](../README.md)** - Setup, installation, and getting started

### Tool Documentation
- **[TOOLS.md](TOOLS.md)** - Complete reference for all 19 tools
  - Detailed descriptions
  - Parameter specifications
  - Return value schemas
  - Tool annotations
  - Error handling

- **[QUICK-REFERENCE.md](QUICK-REFERENCE.md)** - Cheat sheet for quick lookups
  - Tool categories and summaries
  - Common parameters
  - Pagination patterns
  - Authentication setup
  - Common workflows

- **[EXAMPLES.md](EXAMPLES.md)** - Practical usage examples
  - Real-world scenarios
  - Request/response samples
  - Workflow demonstrations
  - Error handling examples

---

## 🎯 Getting Started

### 1. Choose Your Documentation

| Document | Best For |
|----------|----------|
| [QUICK-REFERENCE.md](QUICK-REFERENCE.md) | Quick lookups, syntax reminders, common patterns |
| [TOOLS.md](TOOLS.md) | Complete tool specifications and detailed information |
| [EXAMPLES.md](EXAMPLES.md) | Learning by example, real-world workflows |

### 2. Set Up Authentication

All tools require authentication. Set your API key:

```bash
export CYOPS_API_KEY="your-api-key-here"
# OR
export CYOPS_API_TOKEN="your-api-token-here"
```

### 3. Try Your First Tool

**Example: Get vulnerability statistics**

```json
{
  "tool": "cyops_get_vulnerability_stats",
  "params": {
    "response_format": "markdown"
  }
}
```

See [EXAMPLES.md](EXAMPLES.md) for more examples.

---

## 🔧 Tool Categories

The MCP server provides **19 tools** across 5 categories:

### 1. Vulnerability Management (3 tools)
- `cyops_list_vulnerabilities` - Search and filter vulnerabilities
- `cyops_get_vulnerability` - Get detailed vulnerability information
- `cyops_get_vulnerability_stats` - Dashboard statistics

**Use cases**: Security monitoring, vulnerability prioritization, risk assessment

### 2. Asset Management (4 tools)
- `cyops_list_assets` - Search infrastructure assets
- `cyops_get_asset` - Get asset details
- `cyops_create_asset` - Add new assets
- `cyops_get_asset_stats` - Inventory statistics

**Use cases**: Asset inventory, infrastructure tracking, compliance reporting

### 3. Finding Management (4 tools)
- `cyops_list_findings` - List scanner findings
- `cyops_get_finding` - Get finding details
- `cyops_mark_finding_fixed` - Mark as remediated
- `cyops_mark_finding_verified` - Verify remediation

**Use cases**: Remediation tracking, scanner integration, vulnerability validation

### 4. Report Generation (3 tools)
- `cyops_get_analyst_report` - Technical analyst reports
- `cyops_get_executive_report` - Executive summaries
- `cyops_get_audit_report` - Compliance audit reports

**Use cases**: Stakeholder reporting, compliance audits, trend analysis

### 5. Assessment Report Management (5 tools)
- `cyops_list_assessment_reports` - List PDF reports
- `cyops_get_assessment_report` - Get report metadata
- `cyops_get_report_versions` - View version history
- `cyops_get_report_stats` - Report statistics
- `cyops_delete_assessment_report` - Delete reports (soft delete)

**Use cases**: Document management, version control, storage tracking

---

## 📖 Key Concepts

### Tool Annotations

All tools include MCP-standard annotations:

| Annotation | Meaning |
|------------|---------|
| `readOnlyHint` | Tool doesn't modify data (15 of 19 tools) |
| `destructiveHint` | Tool may perform destructive updates (1 tool: delete) |
| `idempotentHint` | Repeated calls have no additional effect |
| `openWorldHint` | Tool interacts with external API (all 19 tools) |

### Response Formats

All tools support two formats:

**Markdown** (default):
- Human-readable text
- Headers, lists, badges
- Formatted timestamps
- Best for: User presentation

**JSON**:
- Machine-readable data
- Complete field sets
- ISO 8601 timestamps
- Best for: Programmatic processing

### Pagination

List tools use consistent pagination:

**Offset-based** (vulnerabilities, findings):
```json
{
  "limit": 20,
  "offset": 0
}
```

**Page-based** (assets):
```json
{
  "page": 1,
  "limit": 20
}
```

---

## 🚀 Common Workflows

### Weekly Security Triage
1. `cyops_get_vulnerability_stats` → Get overview
2. `cyops_list_vulnerabilities` → List critical/high issues
3. `cyops_get_vulnerability` → Review details
4. `cyops_list_findings` → Check instances

### Asset Management
1. `cyops_get_asset_stats` → Inventory overview
2. `cyops_list_assets` → Search assets
3. `cyops_create_asset` → Add new infrastructure
4. `cyops_get_asset` → Verify details

### Monthly Reporting
1. `cyops_get_executive_report` → Leadership summary
2. `cyops_get_analyst_report` → Technical details
3. `cyops_get_vulnerability_stats` → Current metrics

See [EXAMPLES.md](EXAMPLES.md) for complete workflow examples.

---

## 🔐 Security & Permissions

### Authentication
- Required for all tools
- Uses JWT token or API key
- Set via environment variables
- Validates on every request

### RBAC (Role-Based Access Control)
Tools respect backend RBAC permissions:
- **Admin**: Full access to all tools
- **Analyst**: Read access + finding management
- **User**: Read-only access

### Data Privacy
- All data encrypted in transit (HTTPS)
- API keys never logged
- Soft deletes preserve data
- Audit trails for compliance

---

## 🐛 Troubleshooting

### Common Issues

**Authentication Errors**
```
Error: Authentication failed
Solution: Check CYOPS_API_KEY environment variable
```

**Resource Not Found**
```
Error: Resource not found
Solution: Use list tools to find valid IDs
```

**Duplicate Resource**
```
Error: Duplicate asset
Solution: Check existing resources first
```

See [TOOLS.md](TOOLS.md#error-handling) for complete error reference.

---

## 📊 Performance Tips

1. **Use filters** to reduce result sets
2. **Leverage pagination** for large datasets
3. **Cache stats** endpoints for dashboards
4. **Use JSON format** for programmatic processing
5. **Batch operations** when possible

---

## 🔗 Additional Resources

### Internal Documentation
- [TOOLS.md](TOOLS.md) - Complete tool reference
- [QUICK-REFERENCE.md](QUICK-REFERENCE.md) - Quick lookup guide
- [EXAMPLES.md](EXAMPLES.md) - Practical examples

### External Resources
- [MCP Protocol Documentation](https://modelcontextprotocol.io)
- [CYOPS Backend API](http://localhost:8080/api/v1/docs/)
- [Project README](../README.md)

---

## 📝 Documentation Standards

This documentation follows:
- ✅ MCP best practices
- ✅ Markdown formatting
- ✅ Consistent structure
- ✅ Practical examples
- ✅ Clear error guidance

---

## 🤝 Contributing

To update this documentation:

1. Edit the relevant markdown file
2. Follow existing formatting standards
3. Include practical examples
4. Test all code samples
5. Update version numbers

---

## 📦 Documentation Structure

```
docs/
├── README.md              # This file - Documentation index
├── TOOLS.md               # Complete tool reference (19 tools)
├── QUICK-REFERENCE.md     # Quick lookup cheat sheet
└── EXAMPLES.md            # Practical usage examples
```

---

## 📅 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-11-01 | Initial documentation release |
|  |  | - Complete tool reference |
|  |  | - Quick reference guide |
|  |  | - Practical examples |
|  |  | - MCP best practices compliance |

---

## 📞 Support

For issues or questions:
- Check documentation first
- Review examples for similar use cases
- Verify API key is set correctly
- Check backend API status
- Review error messages for guidance

---

**Total Tools Documented**: 19
**Total Examples**: 18+
**Documentation Pages**: 4
**Last Updated**: 2025-11-01
