# Single Repository Mode - Implementation Notes

## Overview

This document describes the implementation of single repository mode for The NoteWriter Desktop application, which allows launching the app directly from a repository without requiring a global configuration file.

## Launch Modes

The application now supports three launch modes:

### 1. Standard Mode (Existing Behavior)
- **Detection**: No `.nt` directory in current working directory and no directory argument
- **Config Location**: `$NT_HOME/editorconfig.jsonnet` or `~/.nt/editorconfig.jsonnet`
- **Dynamic Config**: Saved to `$NT_HOME/editorconfig.json` or `~/.nt/editorconfig.json`
- **Use Case**: Managing multiple repositories from a central configuration

### 2. Repository Mode (New)
- **Detection**: Current working directory contains a `.nt` subdirectory
- **Config Location**: 
  - First tries `.nt/editorconfig.jsonnet` in the repository
  - If not found, generates in-memory config with single "Default" repository
- **Dynamic Config**: Saved to `.nt/editorconfig.json` in the repository
- **Use Case**: Working with a single repository without global config

### 3. Directory Argument Mode (New)
- **Detection**: First command-line argument is a directory path containing `.nt`
- **Config Location**: Same as Repository Mode, but for the specified directory
- **Dynamic Config**: Saved to `.nt/editorconfig.json` in the specified directory
- **Usage**: `electron . /path/to/repository`
- **Use Case**: Opening a specific repository from anywhere

## Technical Implementation

### Configuration Detection Flow

```typescript
determineLaunchContext() -> {
  1. Check if first argument is a repository directory
  2. Check if current working directory is a repository
  3. Fall back to standard mode (NT_HOME or ~/.nt)
}
```

### In-Memory Config Generation

When a repository has no `editorconfig.jsonnet`, the application generates:

```jsonnet
{
  repositories: [
    {
      name: 'Default',
      slug: 'default',
      path: '<repository-path>',
      selected: true
    }
  ]
}
```

This config is NOT persisted to disk, only kept in memory during the session.

### Module-Level State

The implementation uses a module-level variable `activeConfigDirectory` to store the resolved config directory. This enables the `homeDir()` function to return context-aware paths without requiring all callers to pass the ConfigManager instance.

**Why this approach?**
- `homeDir()` is exported and used in multiple places
- Refactoring all callers would be a breaking change
- The variable is initialized once at startup and never changes
- Makes the code backward compatible

## UI Changes

### Repository Toggle Buttons

When only one repository exists (single repository mode), the UI automatically hides:
- Repository toggle buttons in the top bar
- "Toggle repository..." command in Cmd+K menu

This is implemented by checking `repositories.length > 1` before rendering these elements.

## Testing

### Unit Tests

See `src/main/config-single-repo.test.ts` for comprehensive tests covering:
- In-memory config generation
- Repository detection from current working directory
- Reading from `.nt/editorconfig.jsonnet` when it exists

### Manual Testing

To test single repository mode:

```bash
# Create a test repository
mkdir -p /tmp/test-repo/.nt
cd /tmp/test-repo

# Create minimal repository config
cat > .nt/.config.json << 'EOF'
{
  "core": {
    "extensions": ["md", "markdown"],
    "medias": {
      "command": "ffmpeg",
      "parallel": 1,
      "preset": "ultrafast"
    }
  }
}
EOF

# Launch the app from the repository directory
cd /tmp/test-repo
electron /path/to/the-notewriter-desktop

# Or launch with directory argument
electron /path/to/the-notewriter-desktop /tmp/test-repo
```

## Files Modified

### Core Changes
- `src/main/config.ts` - Main implementation
- `src/renderer/src/components/Main.tsx` - UI updates

### Type Fixes (Pre-existing Issues)
- `src/main/index.ts` - Fixed blockId/deskId naming
- `src/renderer/src/components/Bookmarker.tsx`
- `src/renderer/src/components/Inspiration.tsx`
- `src/renderer/src/components/Planner.tsx`
- `src/renderer/src/components/ZenMode.tsx`
- `src/renderer/src/components/RenderedFlashcard.tsx`
- `src/renderer/src/components/RenderedNotesTab.tsx`

### Build Configuration
- `tsconfig.node.json` - Excluded test files from compilation

### Tests
- `src/main/config-single-repo.test.ts` - New test file

## Compatibility

This implementation is **fully backward compatible**:
- Existing multi-repository setups continue to work unchanged
- No changes required to existing configuration files
- The standard mode behavior is preserved

## Future Improvements

Potential enhancements for future consideration:
1. Support for creating `.nt/editorconfig.jsonnet` interactively on first launch
2. Migration tool to convert multi-repository configs to single-repository mode
3. Command-line flag to force a specific mode
4. Better error messages when repository config is invalid
