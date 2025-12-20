# PPTX Creation, Editing, and Analysis Guide

> **Prerequisites**: This skill requires dependencies to be installed before use. See [Dependencies Setup](#dependencies-setup) below.

## Overview

This guide covers working with PowerPoint presentations (.pptx files) for creation, modification, and analysis tasks using command-line tools and scripts.

## Key Workflows

### Reading Presentations

Extract text content using: `python -m markitdown path-to-file.pptx`

For advanced features like comments, speaker notes, or design elements, unpack the file structure: `python ooxml/scripts/unpack.py <office_file> <output_dir>`

### Creating New Presentations

The recommended approach involves converting HTML slides to PowerPoint format using the html2pptx workflow. This process requires:

1. Reading the complete html2pptx.md documentation
2. Creating HTML files with proper slide dimensions
3. Using the html2pptx.js library to convert and save presentations
4. Validating output with thumbnail generation

**Design Approach**: Before coding, analyze content and select appropriate colors, typography, and visual hierarchy.

Example color palettes:
- **Classic Blue**: Primary #2B579A, Secondary #5B9BD5, Accent #F2C400
- **Modern Green**: Primary #1D6F42, Secondary #8CC06D, Accent #FFC000
- **Corporate Gray**: Primary #404040, Secondary #7F7F7F, Accent #00A0D2
- **Warm Earth**: Primary #8B4513, Secondary #D2691E, Accent #228B22
- **Ocean Depths**: Primary #006994, Secondary #40E0D0, Accent #FF6B6B
- **Sunset Glow**: Primary #FF6B6B, Secondary #FFA07A, Accent #4ECDC4
- **Forest Night**: Primary #2C5530, Secondary #8FBC8F, Accent #DAA520
- **Royal Purple**: Primary #4B0082, Secondary #9370DB, Accent #FFD700
- **Tech Modern**: Primary #1A1A2E, Secondary #16213E, Accent #E94560
- **Minimalist**: Primary #2D3436, Secondary #636E72, Accent #00B894
- **Vibrant Pop**: Primary #FF3366, Secondary #2EC4B6, Accent #F9C80E
- **Elegant Navy**: Primary #1B2838, Secondary #465362, Accent #F5A623
- **Fresh Mint**: Primary #00B894, Secondary #55EFC4, Accent #FF7675
- **Bold Orange**: Primary #E17055, Secondary #FDCB6E, Accent #0984E3
- **Soft Pastel**: Primary #A29BFE, Secondary #FD79A8, Accent #74B9FF
- **Retro Vintage**: Primary #D63031, Secondary #E17055, Accent #00CEC9
- **Nature Green**: Primary #27AE60, Secondary #2ECC71, Accent #F39C12

### Editing Existing Presentations

The OOXML workflow requires:
1. Unpacking the presentation: `python ooxml/scripts/unpack.py <file.pptx> <output_dir>`
2. Editing XML files directly
3. Validating changes immediately
4. Repacking: `python ooxml/scripts/pack.py <input_dir> <output.pptx>`

### Using Templates

Template-based creation involves:
1. Extract template content
2. Analyze layouts visually with thumbnail grids
3. Create presentation outline mapped to template slides
4. Duplicate/reorder slides with `rearrange.py`
5. Extract placeholder text inventory with `inventory.py`
6. Generate replacement content
7. Apply updates via `replace.py`

## Visual Tools

Create thumbnail grids with: `python scripts/thumbnail.py template.pptx [output_prefix]`

This generates visual overviews useful for layout analysis and navigation.

## Dependencies Setup

**This skill requires the following dependencies to function. Install them before use.**

### Node.js (already installed in this project)
```bash
bun add pptxgenjs playwright sharp
```

### Python
```bash
pip install python-pptx defusedxml pillow six
# Or with pipx/venv if using externally-managed Python:
# pipx install python-pptx defusedxml pillow six
```

### System Tools (macOS)
```bash
brew install libreoffice poppler
```

### System Tools (Linux)
```bash
sudo apt install libreoffice poppler-utils
```

## Key Dependencies Reference

- `pptxgenjs` - Presentation generation (Node)
- `playwright` - HTML rendering for html2pptx (Node)
- `sharp` - Image processing for icons/gradients (Node)
- `python-pptx` - PPTX manipulation (Python)
- `defusedxml` - Safe XML parsing for OOXML (Python)
- `pillow` - Text measurement for overflow detection (Python)
- `six` - Python 2/3 compatibility (Python)
- LibreOffice (`soffice`) - PDF conversion, validation
- Poppler (`pdftoppm`) - PDF to image extraction
