#!/bin/sh

set -e

if [ "$OS" = "Windows_NT" ]; then
	platform="windows"
	ext="exe"
else
	case $(uname -s) in
	"Darwin")
		platform="darwin"
		ext="dmg"
		;;
	"Linux")
		platform="linux"
		ext="AppImage"
		;;
	*)
		echo "Error: Unsupported platform $(uname -s)" 1>&2
		exit 1
		;;
	esac
fi

if [ $# -eq 0 ]; then
	nt_desktop_uri="https://github.com/julien-sobczak/the-notewriter-desktop/releases/latest/download/the-notewriter-desktop-${platform}-amd64.${ext}"
else
	nt_desktop_uri="https://github.com/julien-sobczak/the-notewriter-desktop/releases/download/${1}/the-notewriter-desktop-${platform}-amd64.${ext}"
fi

nt_desktop_install="${NT_DESKTOP_INSTALL:-$HOME/.nt-desktop}"
bin_dir="$nt_desktop_install/bin"

if [ ! -d "$bin_dir" ]; then
	mkdir -p "$bin_dir"
fi

echo "Downloading The NoteWriter Desktop from $nt_desktop_uri..."
if ! curl --fail --location --progress-bar --output "$bin_dir/the-notewriter-desktop.${ext}" "$nt_desktop_uri"; then
	echo "Error: Failed to download The NoteWriter Desktop from $nt_desktop_uri" 1>&2
	exit 1
fi

if [ "$platform" = "linux" ]; then
	# Make AppImage executable
	chmod +x "$bin_dir/the-notewriter-desktop.${ext}"
	# Create a symlink for easier access
	ln -sf "$bin_dir/the-notewriter-desktop.${ext}" "$bin_dir/nt-desktop"
	echo ""
	echo "The NoteWriter Desktop was installed successfully to $bin_dir"
	echo ""

	if command -v nt-desktop >/dev/null; then
		echo "Run 'nt-desktop' to get started"
	else
		case $SHELL in
		/bin/zsh) shell_profile=".zshrc" ;;
		*) shell_profile=".bashrc" ;;
		esac
		echo "Manually add the directory to your \$HOME/$shell_profile (or similar)"
		echo "  export NT_DESKTOP_INSTALL=\"$nt_desktop_install\""
		echo "  export PATH=\"\$NT_DESKTOP_INSTALL/bin:\$PATH\""
		echo ""
		echo "Run '$bin_dir/nt-desktop' to get started"
	fi
elif [ "$platform" = "darwin" ]; then
	echo ""
	echo "The NoteWriter Desktop DMG was downloaded successfully to $bin_dir/the-notewriter-desktop.${ext}"
	echo ""
	echo "To install:"
	echo "  1. Open the DMG file: open $bin_dir/the-notewriter-desktop.${ext}"
	echo "  2. Drag the application to your Applications folder"
	echo ""
	echo "To make 'nt-desktop' command available in terminal:"
	echo "  Create a wrapper script after installation:"
	echo "    echo '#!/bin/sh' > $bin_dir/nt-desktop"
	echo "    echo 'open -a \"the-notewriter-desktop\"' >> $bin_dir/nt-desktop"
	echo "    chmod +x $bin_dir/nt-desktop"
	echo ""
	if ! command -v nt-desktop >/dev/null; then
		case $SHELL in
		/bin/zsh) shell_profile=".zshrc" ;;
		*) shell_profile=".bashrc" ;;
		esac
		echo "  Then add the directory to your \$HOME/$shell_profile:"
		echo "    export NT_DESKTOP_INSTALL=\"$nt_desktop_install\""
		echo "    export PATH=\"\$NT_DESKTOP_INSTALL/bin:\$PATH\""
		echo ""
	fi
else
	# Windows
	echo ""
	echo "The NoteWriter Desktop installer was downloaded successfully to $bin_dir/the-notewriter-desktop.${ext}"
	echo ""
	echo "To install, run the installer: $bin_dir/the-notewriter-desktop.${ext}"
	echo "The installer will make the application accessible from the Start menu and desktop."
	echo ""
fi
