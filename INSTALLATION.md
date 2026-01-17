# InfoLearn Pro - Installation & Usage Guide

## 📦 Installation

### Option 1: From Obsidian Community Plugins (Recommended)

1. Open **Obsidian**
2. Go to **Settings** → **Community Plugins**
3. Click **Browse**
4. Search for **"InfoLearn Pro"**
5. Click **Install**
6. Enable the plugin

### Option 2: Manual Installation

1. Download the latest release from [GitHub Releases](https://github.com/infolearn-pro/infolearn-pro/releases)
2. Extract the ZIP file
3. Navigate to your Obsidian vault folder
4. Open `.obsidian/plugins/` directory
5. Create a new folder: `infolearn-pro`
6. Copy `main.js` and `manifest.json` into this folder
7. Reload Obsidian (Ctrl+R or Cmd+R)
8. Go to **Settings** → **Community Plugins** → Enable **InfoLearn Pro**

### Option 3: Development Installation

```bash
# Clone repository
git clone https://github.com/infolearn-pro/infolearn-pro.git
cd infolearn-pro

# Install dependencies
npm install

# Build
npm run build

# Copy to Obsidian plugins folder
cp main.js manifest.json ~/.obsidian/plugins/infolearn-pro/

# Reload Obsidian
```

## ⚙️ Configuration

### Step 1: Open Settings

1. Open **Obsidian Settings**
2. Go to **Community Plugins** section
3. Find **InfoLearn Pro**
4. Click the **gear icon** to open settings

### Step 2: Configure AI Providers

#### OpenAI

1. Go to [OpenAI API](https://platform.openai.com/api-keys)
2. Create a new API key
3. In InfoLearn Pro Settings, select **OpenAI** tab
4. Paste your API key
5. Click **Test Connection**
6. ✓ Connection successful!

**Supported Models:**
- `gpt-4-turbo` (Recommended)
- `gpt-4`
- `gpt-3.5-turbo`

#### Anthropic

1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Create a new API key
3. In InfoLearn Pro Settings, select **Anthropic** tab
4. Paste your API key
5. Click **Test Connection**

**Supported Models:**
- `claude-3-opus` (Recommended)
- `claude-3-sonnet`
- `claude-3-haiku`

#### Google Gemini

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. In InfoLearn Pro Settings, select **Gemini** tab
4. Paste your API key
5. Click **Test Connection**

**Supported Models:**
- `gemini-2.0-flash` (Recommended)
- `gemini-pro`
- `gemini-pro-vision`

#### xAI Grok

1. Go to [xAI Console](https://console.x.ai/)
2. Create a new API key
3. In InfoLearn Pro Settings, select **Grok** tab
4. Paste your API key
5. Click **Test Connection**

**Supported Models:**
- `grok-3` (Recommended)
- `grok-2`
- `grok-1`

#### Zhipu GLM

1. Go to [Zhipu Console](https://open.bigmodel.cn/)
2. Create a new API key
3. In InfoLearn Pro Settings, select **Zhipu** tab
4. Paste your API key
5. Click **Test Connection**

**Supported Models:**
- `glm-4.7` (Recommended - 코딩플랜)
- `glm-4`
- `glm-3`

### Step 3: Set Default Provider

1. In InfoLearn Pro Settings
2. Select your preferred default provider
3. Settings are automatically saved

## 🎯 Usage Guide

### Blanking Mode

**Purpose**: Interactive fill-in-the-blank learning exercises

**Steps:**

1. **Select Text**
   - Copy text from your infographic or document
   - Paste into InfoLearn Pro

2. **Start Blanking**
   - Click the **Blanking** button in the mode selector
   - AI automatically identifies key terms

3. **Complete Exercise**
   - Fill in each blank with your answer
   - Click **Submit** to check
   - Get instant feedback

4. **Review Results**
   - See accuracy percentage
   - Review correct answers
   - Track your progress

**Tips:**
- Start with easier texts
- Review feedback carefully
- Repeat difficult sections
- Use spaced repetition

### Rewriting Mode

**Purpose**: View content from multiple perspectives

**Steps:**

1. **Select Text**
   - Copy text you want to rewrite
   - Paste into InfoLearn Pro

2. **Choose Style**
   - 📋 **Summary**: Concise 2-3 sentence overview
   - 📚 **Detailed**: Comprehensive explanation
   - 🌱 **Beginner**: Simple terms for beginners
   - 🎓 **Expert**: Advanced analysis
   - 📖 **Story**: Engaging narrative
   - 📊 **Report**: Professional format

3. **Compare Versions**
   - Original and rewritten side-by-side
   - Check readability scores
   - Copy your preferred version

4. **Export**
   - Click **Export Result** to copy
   - Paste into your notes

**Tips:**
- Try multiple styles
- Compare readability scores
- Use for different audiences
- Combine with Blanking mode

### Association Mode

**Purpose**: Build knowledge graphs and concept connections

**Steps:**

1. **Create New Link**
   - Click **+ New Link** button
   - Enter source keyword
   - Select relationship type
   - Enter target note
   - Add optional notes

2. **Define Relationships**
   - 🔗 **Related**: General relationship
   - → **Causes**: Causal relationship
   - 💡 **Explains**: Definitional relationship
   - 📝 **Example**: Exemplification
   - ⚖️ **Contrast**: Contrasting relationship

3. **Build Graph**
   - Create multiple links
   - Connect related concepts
   - View statistics

4. **Visualize**
   - See total links
   - Check unique notes
   - View average strength
   - Analyze graph density

**Tips:**
- Start with main concepts
- Link related ideas
- Use consistent terminology
- Review regularly

## 🔒 Privacy & Security

### Data Storage

- ✅ All data stored **locally** in your Obsidian vault
- ✅ No cloud synchronization
- ✅ No data collection
- ✅ No tracking

### API Keys

- ✅ API keys stored **locally** and encrypted
- ✅ Never sent to external servers
- ✅ Only used for AI provider communication
- ✅ You control all API usage

### Recommendations

1. **Use Strong Passwords**
   - Protect your Obsidian vault
   - Use encryption if available

2. **Rotate API Keys**
   - Change API keys periodically
   - Revoke unused keys

3. **Monitor Usage**
   - Check API provider dashboards
   - Set usage limits/alerts

4. **Backup Data**
   - Regular vault backups
   - Offline copies

## 🆘 Troubleshooting

### Plugin Not Showing

**Problem**: InfoLearn Pro doesn't appear in plugin list

**Solutions:**
1. Check Obsidian version (requires 0.15.0+)
2. Restart Obsidian completely
3. Clear plugin cache:
   - Close Obsidian
   - Delete `.obsidian/plugins/infolearn-pro/.obsidian` folder
   - Restart Obsidian

### AI Connection Failed

**Problem**: "Connection Failed" when testing API

**Solutions:**
1. **Check API Key**
   - Verify key is correct
   - Copy-paste carefully
   - Check for extra spaces

2. **Check Internet**
   - Verify internet connection
   - Check firewall settings
   - Try different network

3. **Check API Status**
   - Visit provider's status page
   - Check for outages
   - Try different provider

4. **Check Quota**
   - Verify API key has credits
   - Check usage limits
   - Upgrade account if needed

### Slow Performance

**Problem**: Plugin is slow or unresponsive

**Solutions:**
1. **Reduce Load**
   - Close other plugins
   - Disable unnecessary features
   - Reduce vault size

2. **Clear Cache**
   - Restart Obsidian
   - Clear browser cache
   - Delete temporary files

3. **Update**
   - Check for plugin updates
   - Update Obsidian
   - Update system

### Text Not Recognized

**Problem**: AI can't identify keywords properly

**Solutions:**
1. **Use Clearer Text**
   - Use well-formatted text
   - Avoid special characters
   - Use proper grammar

2. **Try Different Provider**
   - Switch to different AI model
   - Test with OpenAI (most reliable)
   - Check provider documentation

3. **Adjust Settings**
   - Try different model
   - Adjust prompt parameters
   - Enable/disable features

## 📞 Support

### Getting Help

- **Documentation**: Check [README.md](README.md)
- **Development Guide**: See [DEVELOPMENT.md](DEVELOPMENT.md)
- **GitHub Issues**: [Report bugs](https://github.com/infolearn-pro/issues)
- **Discussions**: [Ask questions](https://github.com/infolearn-pro/discussions)

### Reporting Bugs

When reporting bugs, include:

1. **Obsidian Version**
   - Settings → About → Version

2. **Plugin Version**
   - Settings → Community Plugins → InfoLearn Pro

3. **Error Message**
   - Copy exact error text
   - Include console logs

4. **Steps to Reproduce**
   - Clear step-by-step instructions
   - Include sample text
   - Mention AI provider used

### Feature Requests

We welcome feature suggestions! Please:

1. Check existing issues
2. Describe the feature clearly
3. Explain the use case
4. Provide examples

## 📚 Learning Resources

### Getting Started

1. Read the README
2. Configure one AI provider
3. Try Blanking mode first
4. Experiment with Rewriting
5. Build your first knowledge graph

### Best Practices

1. **Blanking Mode**
   - Start with short texts
   - Review all feedback
   - Repeat exercises

2. **Rewriting Mode**
   - Compare multiple styles
   - Use for different audiences
   - Combine with other modes

3. **Association Mode**
   - Link related concepts
   - Use consistent terms
   - Review regularly

## 🎓 Educational Tips

### Effective Learning

1. **Active Recall**
   - Use Blanking mode regularly
   - Test yourself frequently
   - Review mistakes

2. **Spaced Repetition**
   - Review after 1 day
   - Review after 3 days
   - Review after 1 week

3. **Multiple Perspectives**
   - Use Rewriting mode
   - Try different styles
   - Connect concepts

4. **Knowledge Graphs**
   - Build associations
   - Visualize connections
   - Expand understanding

## 🚀 Advanced Usage

### Custom Workflows

1. **Research Workflow**
   - Extract text from papers
   - Use Rewriting for summaries
   - Build knowledge graph

2. **Study Workflow**
   - Create Blanking exercises
   - Review with Rewriting
   - Connect with Association

3. **Teaching Workflow**
   - Generate multiple versions
   - Create study materials
   - Build concept maps

### Integration with Obsidian

- Link to InfoLearn notes
- Use with Obsidian plugins
- Integrate with daily notes
- Create learning vaults

---

**Ready to enhance your learning?** Start with the [Configuration](#configuration) section! 🚀
