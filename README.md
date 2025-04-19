# 🔍 Box-Enum: Multi-Tool Security Scanner

A modern web interface for running multiple security scanning tools simultaneously. Combines the power of Nmap, Dirb, and Gobuster in one sleek dashboard.


## ✨ Features

- **🔄 Real-time Scanning**: Monitor scan progress in real-time
- **🎯 Multiple Tools**: Run Nmap, Dirb, and Gobuster simultaneously
- **📊 Unified Interface**: All results in one clean dashboard
- **💫 Modern UI**: Sleek, responsive design with status indicators
- **📝 Detailed Results**: Comprehensive output from each tool
- **🔄 Auto-refresh**: Live updates without manual refresh

## 🛠️ Integrated Tools

### Nmap Scanner
- Network mapping and port scanning
- Service version detection
- OS fingerprinting
- Security vulnerability scanning

### Dirb Scanner
- Web content discovery
- Hidden directory enumeration
- Backup file detection
- Configuration file scanning

### Gobuster Scanner
- Directory brute forcing
- DNS subdomain scanning
- Virtual host discovery
- Custom wordlist support

## 🚀 Getting Started

### Prerequisites
- Python 3.8+
- Nmap
- Dirb
- Gobuster
- Web browser

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/box-enum.git
cd box-enum
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

3. Install required tools:
```bash
# For Debian/Ubuntu
sudo apt-get update
sudo apt-get install nmap dirb gobuster

# For macOS
brew install nmap dirb gobuster
```

4. Start the application:
```bash
python box-enum.py
```

5. Open your browser and navigate to:
```
http://localhost:5000
```

## 🎯 Usage

1. Enter the target IP address in the input field
2. (Optional) Specify a custom wordlist path for Gobuster
3. Click "Start Scan" to begin the scanning process
4. Monitor real-time progress in the status cards
5. View detailed results by expanding each tool's section
6. Use the refresh button to update results manually if needed

## 🔒 Security Considerations

- Only scan systems you have permission to test
- Be aware of local network and security policies
- Some scans may trigger security alerts
- Use responsibly and ethically

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Thanks to the creators of Nmap, Dirb, and Gobuster
- Inspired by various security testing tools
- Built with Flask and modern web technologies

## 📞 Support

If you encounter any problems or have suggestions:
1. Check the [Issues](https://github.com/yourusername/box-enum/issues) page
2. Create a new issue with detailed information
3. Join our community discussions

---

<div align="center">
Made with ❤️ for the security community
</div> 
