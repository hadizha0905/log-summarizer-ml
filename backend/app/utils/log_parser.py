"""Log parser utility"""
import re
from typing import Dict, Any, Optional
from datetime import datetime

class LogParser:
    """Utility for parsing various log formats"""
    
    def __init__(self):
        self.patterns = {
            'timestamp': r'\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}',
            'level': r'(DEBUG|INFO|WARNING|ERROR|CRITICAL|FATAL)',
            'ip': r'\b(?:\d{1,3}\.){3}\d{1,3}\b',
            'email': r'\S+@\S+',
        }
    
    def parse_timestamp(self, text: str) -> Optional[datetime]:
        """Extract timestamp from log"""
        match = re.search(self.patterns['timestamp'], text)
        if match:
            try:
                return datetime.fromisoformat(match.group())
            except:
                return None
        return None
    
    def parse_level(self, text: str) -> Optional[str]:
        """Extract log level"""
        match = re.search(self.patterns['level'], text, re.IGNORECASE)
        return match.group(1).lower() if match else None
    
    def parse_syslog(self, line: str) -> Dict[str, Any]:
        """Parse syslog format"""
        pattern = r'(?P<timestamp>\w+\s+\d+\s+\d+:\d+:\d+)\s+(?P<hostname>\S+)\s+(?P<service>\S+):\s+(?P<message>.*)'
        match = re.match(pattern, line)
        return match.groupdict() if match else {'message': line}
    
    def parse_json(self, text: str) -> Optional[Dict]:
        """Parse JSON log"""
        try:
            import json
            return json.loads(text)
        except:
            return None