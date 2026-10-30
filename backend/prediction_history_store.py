import os
import json
from datetime import datetime

HISTORY_FILE = os.path.join(os.path.dirname(__file__), "predictions_history.json")

class PredictionHistoryStore:
    def __init__(self, file_path=HISTORY_FILE):
        self.file_path = file_path
        self._ensure_storage()

    def _ensure_storage(self):
        if not os.path.exists(self.file_path):
            with open(self.file_path, "w", encoding="utf-8") as f:
                json.dump([], f, indent=2)

    def get_history(self, machine_id=None, limit=100):
        try:
            if os.path.exists(self.file_path):
                with open(self.file_path, "r", encoding="utf-8") as f:
                    records = json.load(f)
                    if machine_id:
                        records = [r for r in records if r.get("machine_id", "").upper() == machine_id.upper()]
                    return records[:limit]
        except Exception as e:
            print(f"[PredictionHistoryStore] Error reading {self.file_path}: {e}")
        return []

    def add_record(self, record):
        try:
            records = self.get_history(limit=1000)
            if "id" not in record:
                record["id"] = f"PRED-{1000 + len(records) + 1}"
            if "timestamp" not in record:
                record["timestamp"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            records.insert(0, record)
            with open(self.file_path, "w", encoding="utf-8") as f:
                json.dump(records, f, indent=2)
            return record
        except Exception as e:
            print(f"[PredictionHistoryStore] Error saving record: {e}")
            return record

prediction_history_store = PredictionHistoryStore()
