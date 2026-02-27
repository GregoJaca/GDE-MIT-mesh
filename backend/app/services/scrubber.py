import logging
import json
from presidio_analyzer import AnalyzerEngine
from presidio_anonymizer import AnonymizerEngine

logger = logging.getLogger(__name__)

class ContentScrubber:
    def __init__(self):
        try:
            self.analyzer = AnalyzerEngine()
            self.anonymizer = AnonymizerEngine()
            logger.info("Presidio Engines Loaded.")
        except Exception as e:
            logger.error(f"Failed to load Presidio: {e}")
            self.analyzer = None
            self.anonymizer = None

    def scrub(self, text: str) -> tuple[str, dict]:
        if not self.analyzer or not self.anonymizer:
            logger.warning("Scrubber offline. Returning unscrubbed.")
            return text, {}

        try:
            results = self.analyzer.analyze(text=text, entities=["PERSON", "LOCATION", "DATE_TIME"], language='en')
        except Exception as e:
            logger.error(f"Analyzer failed: {e}")
            return text, {}

        # Sort results by start index in reverse to replace from end to start without throwing off indices
        results.sort(key=lambda x: x.start, reverse=True)
        
        scrubbed_text = text
        token_map = {}
        counters = {"PERSON": 0, "LOCATION": 0, "DATE_TIME": 0}

        for res in results:
            entity_type = res.entity_type
            if entity_type in counters:
                counters[entity_type] += 1
                token = f"[{entity_type}_{counters[entity_type]}]"
                original_text = text[res.start:res.end]
                token_map[token] = original_text
                scrubbed_text = scrubbed_text[:res.start] + token + scrubbed_text[res.end:]
                
        return scrubbed_text, token_map

    def hydrate_dict(self, data: dict, token_map: dict) -> dict:
        """Recursively search through dict and replace any token substrings with original values."""
        if not token_map:
            return data
            
        # Convert dict to string, replace, convert back (fastest for JSON)
        data_str = json.dumps(data)
        for token, original in token_map.items():
            data_str = data_str.replace(token, original)
        return json.loads(data_str)

scrubber = ContentScrubber()
