# LightStyler

A comprehensive SillyTavern extension that enhances chat aesthetics with dynamic
avatar layouts, character banners, and alternative image management.

## Images First 

Mobile Layout
![Mobile](https://github.com/user-attachments/assets/bddff92e-23f8-49ff-989d-5b26cba312ce)

PC Layout - Custom or Avatar Banner (Left Avatar Size can be changed)
![SkyBanner](https://github.com/user-attachments/assets/5dd5067e-a2fe-455b-972b-2c2e8bf07440)
![AvatarBanner](https://github.com/user-attachments/assets/d836a3db-2d28-4f74-81ec-ff9a92d8f064)





## 🎨 Core Theme Features

**Dynamic Avatar Layout System:**
- **Large & Small Avatar Modes** - Switch between compact and expanded avatar layouts
- **Custom Avatar Sizing** - Precise pixel control over avatar width and positioning
- **Edit Buttons Positioning** - Automatically adjusts edit buttons locations to account for word wrapping with larger avatars
- **Character & Persona Banners** - Adds beautiful header banners above each
  message using character/persona avatars. Inspired by Rivelle's MoonLit Echoes
  whipser theme.
- **Banner Image Positioning** - Fine-tune Y-position (%) to perfectly frame banner images for both characters and personas


**Whisper Light Theme Toggle:**
- **Selective Activation** - Enable/disable the full theme while keeping core
  functionality (UID grabbing, avatar processing) to allow overhauls with css
  snippets.


## ✨ Alternative Banner Images Feature

**Universal Character Management:**
- Select and configure any character's alternative images without switching to their chat
- **Smart Auto-Selection** - Refresh button will auto-select and load the
  current character. Images only apply to their corresponding character.
- **Preview Functionality** - Preview images before applying them

## 🎯 How Alternative Banner Images Work

**Image Gallery:** Upload photos within Silly Tavern via the image gallery. Character
Management Panel > Select Character > Dropdown Next to Avatar > Show Gallery >
Drop Images > Click 🔃 in LightStyler Settings and it will populate and switch
to current character. 

**Character Folder Mapping:** Or place them in `/user/images/[character name]`.
Wherever your data is saved. Character names must match and will apply to all
characters with same name. All duplicates will use one folder.

**Universal Access:** You can manage any character's alternative images from the
settings panel. If you select "Jane Silly's" folder while in "John
Tavern's" chat, it will apply it to Jane Silly's banner. 


## 🔄 Per-Character Position Settings

**Smart Position Storage:**
- Each character's Persona and Character Y-position settings are saved individually
- When you adjust position settings, they're automatically saved for the current character
- Switching to a different character loads their specific position preferences


## 📋 Prerequisites

- **SillyTavern** - Latest version recommended

## 🚀 Installation

1. Install with github link via extension manager in ST.
2. Enable the extension in the Extensions panel
3. Configure settings in the LightStyler panel

- **Note** - If the chat gets a bit slow I highly recommend lowering `# Msg. to
  Load` in User Settings > Chat/Message Handling. LightStyler processes each
  message individually for character-specific styling, so fewer messages =
  faster loading. Massive chats take a few seconds to load, but hasn't felt sluggish.


- **Inspo and Credit**
I was heavily inspired by RivelleDays Moonlit Echoes Extension and Character
styler. Please check them out. This was just my answer to wanting the whisper
theme but without all the extra. 

It started as just a CSS Snippet and became this. 
[RivelleDays Moonlite Echoes Theme](https://github.com/RivelleDays/SillyTavern-MoonlitEchoesTheme)
[LenAnderson's CSS Snippets](https://github.com/LenAnderson/SillyTavern-CssSnippets)


---
*Created by AIArchaea*"
