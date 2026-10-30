import os
import json
from datetime import datetime

STORAGE_FILE = os.path.join(os.path.dirname(__file__), "machines_store.json")

class MachineStorage:
    def __init__(self, storage_path=STORAGE_FILE):
        self.storage_path = storage_path
        self._ensure_storage()

    def _ensure_storage(self):
        if not os.path.exists(self.storage_path):
            with open(self.storage_path, "w", encoding="utf-8") as f:
                json.dump([], f, indent=2)

    def load_registered_machines(self):
        try:
            if os.path.exists(self.storage_path):
                with open(self.storage_path, "r", encoding="utf-8") as f:
                    return json.load(f)
        except Exception as e:
            print(f"[MachineStorage] Error reading {self.storage_path}: {e}")
        return []

    def save_registered_machines(self, machines):
        try:
            with open(self.storage_path, "w", encoding="utf-8") as f:
                json.dump(machines, f, indent=2)
            return True
        except Exception as e:
            print(f"[MachineStorage] Error saving {self.storage_path}: {e}")
            return False

    def add_machine(self, machine_data):
        machines = self.load_registered_machines()
        # Check if ID already exists
        for m in machines:
            if m["id"].strip().upper() == machine_data["id"].strip().upper():
                raise ValueError(f"Machine with ID '{machine_data['id']}' already exists.")

        if "registered_at" not in machine_data:
            machine_data["registered_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        machines.append(machine_data)
        self.save_registered_machines(machines)
        return machine_data

    def update_machine_sensors(self, machine_id, sensor_definitions):
        machines = self.load_registered_machines()
        found = False
        for m in machines:
            if m["id"].strip().upper() == machine_id.strip().upper():
                m["sensor_definitions"] = sensor_definitions
                found = True
                break
        if found:
            self.save_registered_machines(machines)
            return True
        return False

machine_storage = MachineStorage()
