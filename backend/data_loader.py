import os
import random
import pandas as pd
from datetime import datetime

from machine_storage import machine_storage

class MachineDataManager:
    def __init__(self, dataset_path=None):
        if dataset_path is None:
            possible_paths = [
                os.path.join(os.path.dirname(__file__), "..", "ai4i2020.csv"),
                os.path.join(os.path.dirname(__file__), "ai4i2020.csv"),
                "ai4i2020.csv"
            ]
            for p in possible_paths:
                if os.path.exists(p):
                    dataset_path = p
                    break

        self.dataset_path = dataset_path
        self.df = None
        self.dataset_index = 0
        if self.dataset_path and os.path.exists(self.dataset_path):
            self.df = pd.read_csv(self.dataset_path)

        # Industrial Machines Inventory
        self.machines = [
            {
                "id": "CNC-M14860",
                "name": "Titan 5-Axis CNC Milling Center",
                "industry": "Manufacturing",
                "type": "CNC Machine",
                "location": "Bay 3, Precision Machining Hall",
                "description": "High-precision vertical machining center for aerospace titanium alloys",
                "sensor_definitions": [
                    {"key": "air_temperature_k", "label": "Air Temperature", "unit": "K", "min": 295, "max": 305, "nominal": 298.5},
                    {"key": "process_temperature_k", "label": "Process Temperature", "unit": "K", "min": 305, "max": 315, "nominal": 308.6},
                    {"key": "rotational_speed_rpm", "label": "Spindle Speed", "unit": "RPM", "min": 1100, "max": 2800, "nominal": 1551},
                    {"key": "torque_nm", "label": "Cutting Torque", "unit": "Nm", "min": 10, "max": 75, "nominal": 42.8},
                    {"key": "tool_wear_min", "label": "Tool Wear Accumulated", "unit": "min", "min": 0, "max": 250, "nominal": 195}
                ],
                "readings": {
                    "air_temperature_k": 301.2,
                    "process_temperature_k": 310.8,
                    "rotational_speed_rpm": 1410,
                    "torque_nm": 52.4,
                    "tool_wear_min": 210
                },
                "history": []
            },
            {
                "id": "CNC-L47181",
                "name": "Okuma LB3000 Precision Lathe",
                "industry": "Manufacturing",
                "type": "CNC Machine",
                "location": "Line 1, Lathe Cell",
                "description": "Horizontal CNC lathe with live tooling for transmission shafts",
                "sensor_definitions": [
                    {"key": "air_temperature_k", "label": "Air Temperature", "unit": "K", "min": 295, "max": 305, "nominal": 298.2},
                    {"key": "process_temperature_k", "label": "Process Temperature", "unit": "K", "min": 305, "max": 315, "nominal": 308.7},
                    {"key": "rotational_speed_rpm", "label": "Spindle Speed", "unit": "RPM", "min": 1100, "max": 2800, "nominal": 1408},
                    {"key": "torque_nm", "label": "Cutting Torque", "unit": "Nm", "min": 10, "max": 75, "nominal": 46.3},
                    {"key": "tool_wear_min", "label": "Tool Wear Accumulated", "unit": "min", "min": 0, "max": 250, "nominal": 45}
                ],
                "readings": {
                    "air_temperature_k": 298.4,
                    "process_temperature_k": 308.6,
                    "rotational_speed_rpm": 1520,
                    "torque_nm": 38.5,
                    "tool_wear_min": 45
                },
                "history": []
            },
            {
                "id": "MOT-IND-01",
                "name": "Siemens 75kW Induction Motor",
                "industry": "Automotive",
                "type": "Electric Motor",
                "location": "Robotic Stamping Line A",
                "description": "Heavy-duty electric drive motor on robotic stamping press line",
                "sensor_definitions": [
                    {"key": "air_temperature_k", "label": "Ambient Temp", "unit": "K", "min": 295, "max": 305, "nominal": 298.1},
                    {"key": "process_temperature_k", "label": "Stator Winding Temp", "unit": "K", "min": 305, "max": 315, "nominal": 309.2},
                    {"key": "rotational_speed_rpm", "label": "Rotor Speed", "unit": "RPM", "min": 1200, "max": 2000, "nominal": 1485},
                    {"key": "torque_nm", "label": "Shaft Output Torque", "unit": "Nm", "min": 20, "max": 70, "nominal": 41.2},
                    {"key": "tool_wear_min", "label": "Bearing Wear Index", "unit": "min", "min": 0, "max": 250, "nominal": 120}
                ],
                "readings": {
                    "air_temperature_k": 299.1,
                    "process_temperature_k": 309.5,
                    "rotational_speed_rpm": 1480,
                    "torque_nm": 43.1,
                    "tool_wear_min": 115
                },
                "history": []
            },
            {
                "id": "BRG-AUTO-03",
                "name": "Koyo Automotive Spindle Bearing Unit",
                "industry": "Automotive",
                "type": "Bearing System",
                "location": "Chassis Assembly Cell 4",
                "description": "High-velocity roller bearing assembly operating on automated chassis assembly line",
                "sensor_definitions": [
                    {"key": "air_temperature_k", "label": "Housing Temp", "unit": "K", "min": 295, "max": 305, "nominal": 298.5},
                    {"key": "process_temperature_k", "label": "Inner Race Temp", "unit": "K", "min": 305, "max": 315, "nominal": 309.0},
                    {"key": "rotational_speed_rpm", "label": "Shaft Angular Velocity", "unit": "RPM", "min": 1000, "max": 2600, "nominal": 1620},
                    {"key": "torque_nm", "label": "Bearing Friction Torque", "unit": "Nm", "min": 15, "max": 65, "nominal": 34.0},
                    {"key": "tool_wear_min", "label": "Raceway Fatigue Index", "unit": "min", "min": 0, "max": 250, "nominal": 68}
                ],
                "readings": {
                    "air_temperature_k": 298.7,
                    "process_temperature_k": 308.9,
                    "rotational_speed_rpm": 1650,
                    "torque_nm": 32.5,
                    "tool_wear_min": 68
                },
                "history": []
            },
            {
                "id": "PUMP-HP-02",
                "name": "Flowserve High-Pressure Feed Pump",
                "industry": "Energy",
                "type": "Hydraulic Pump",
                "location": "Thermal Generation Pump Station 2",
                "description": "Multistage centrifugal water injection pump in thermal generation station",
                "sensor_definitions": [
                    {"key": "air_temperature_k", "label": "Ambient Cell Temp", "unit": "K", "min": 295, "max": 305, "nominal": 299.0},
                    {"key": "process_temperature_k", "label": "Fluid Seal Temp", "unit": "K", "min": 305, "max": 315, "nominal": 310.5},
                    {"key": "rotational_speed_rpm", "label": "Impeller Velocity", "unit": "RPM", "min": 1100, "max": 2200, "nominal": 1390},
                    {"key": "torque_nm", "label": "Hydrodynamic Load", "unit": "Nm", "min": 25, "max": 75, "nominal": 56.5},
                    {"key": "tool_wear_min", "label": "Impeller Cavitation Index", "unit": "min", "min": 0, "max": 250, "nominal": 185}
                ],
                "readings": {
                    "air_temperature_k": 302.8,
                    "process_temperature_k": 312.4,
                    "rotational_speed_rpm": 1340,
                    "torque_nm": 62.0,
                    "tool_wear_min": 185
                },
                "history": []
            },
            {
                "id": "COMP-GAS-05",
                "name": "Atlas Copco Turbo Gas Compressor",
                "industry": "Energy",
                "type": "Air Compressor",
                "location": "Utility Compressor Bay B",
                "description": "Multi-stage rotary screw compressor supplying dry compressed instrument air",
                "sensor_definitions": [
                    {"key": "air_temperature_k", "label": "Intake Temp", "unit": "K", "min": 295, "max": 305, "nominal": 298.3},
                    {"key": "process_temperature_k", "label": "Compression Chamber Temp", "unit": "K", "min": 305, "max": 315, "nominal": 309.8},
                    {"key": "rotational_speed_rpm", "label": "Screw Rotor Velocity", "unit": "RPM", "min": 1300, "max": 2400, "nominal": 1710},
                    {"key": "torque_nm", "label": "Compression Shaft Torque", "unit": "Nm", "min": 15, "max": 60, "nominal": 36.2},
                    {"key": "tool_wear_min", "label": "Rotor Vane Wear", "unit": "min", "min": 0, "max": 250, "nominal": 82}
                ],
                "readings": {
                    "air_temperature_k": 298.6,
                    "process_temperature_k": 309.2,
                    "rotational_speed_rpm": 1720,
                    "torque_nm": 35.8,
                    "tool_wear_min": 82
                },
                "history": []
            }
        ]

        # Load persistently registered machines from storage
        registered = machine_storage.load_registered_machines()
        for rm in registered:
            if not any(m["id"].strip().upper() == rm["id"].strip().upper() for m in self.machines):
                self.machines.append(rm)

        # Prepopulate initial history points for each machine
        for m in self.machines:
            if "history" not in m or not m["history"]:
                m["history"] = self._generate_initial_history(m.get("readings", {}))

    def _generate_initial_history(self, current):
        history = []
        for i in range(12, 0, -1):
            factor = 1.0 + (random.uniform(-0.04, 0.04))
            point = {"timestamp": f"-{i*5}m"}
            for k, val in current.items():
                try:
                    num_val = float(val)
                    if k == "tool_wear_min":
                        point[k] = max(0, int(num_val - (i * 0.5)))
                    elif "rpm" in k or "speed" in k or "count" in k:
                        point[k] = int(num_val * factor)
                    else:
                        point[k] = round(num_val * factor, 2)
                except (ValueError, TypeError):
                    point[k] = val
            history.append(point)
        return history

    def get_all_machines(self):
        return self.machines

    def get_machine(self, machine_id):
        for m in self.machines:
            if m["id"].strip().upper() == machine_id.strip().upper():
                return m
        return None

    def add_machine(self, machine_data):
        # Validate uniqueness in memory
        for m in self.machines:
            if m["id"].strip().upper() == machine_data["id"].strip().upper():
                raise ValueError(f"Machine with ID '{machine_data['id']}' already exists.")

        # Ensure sensor readings exist
        if "readings" not in machine_data or not machine_data["readings"]:
            readings = {}
            for s in machine_data.get("sensor_definitions", []):
                readings[s["key"]] = float(s.get("nominal", 0.0))
            machine_data["readings"] = readings

        if "connection_status" not in machine_data:
            machine_data["connection_status"] = "SIMULATED"
        if "telemetry_source" not in machine_data:
            machine_data["telemetry_source"] = "SIMULATED"

        machine_data["history"] = self._generate_initial_history(machine_data["readings"])
        saved = machine_storage.add_machine(machine_data)
        self.machines.append(saved)
        return saved

    def update_machine_sensor_definitions(self, machine_id, sensor_definitions):
        target = self.get_machine(machine_id)
        if not target:
            return False
        target["sensor_definitions"] = sensor_definitions
        # Ensure readings dictionary has entries for all new keys
        for s in sensor_definitions:
            k = s.get("key")
            if k and k not in target["readings"]:
                target["readings"][k] = float(s.get("nominal", 0.0))
        machine_storage.update_machine_sensors(machine_id, sensor_definitions)
        return True

    def update_machine_readings(self, machine_id, new_readings, source="MANUAL"):
        for m in self.machines:
            if m["id"].strip().upper() == machine_id.strip().upper():
                m["readings"].update(new_readings)
                if source == "HARDWARE":
                    m["telemetry_source"] = "HARDWARE"
                    m["connection_status"] = "HARDWARE_CONNECTED"
                    m["last_hardware_ping"] = datetime.now().isoformat()
                else:
                    m["telemetry_source"] = "MANUAL"
                    m["connection_status"] = "MANUAL_INPUT"

                m["history"].append({
                    "timestamp": datetime.now().strftime("%H:%M:%S"),
                    **m["readings"]
                })
                if len(m["history"]) > 30:
                    m["history"].pop(0)
                return m
        return None

    def tick_simulation(self):
        """
        Advances the live simulation by updating readings for all machines within their configured sensor definitions.
        If a machine has an active real hardware stream (pinged within 45s), simulation preserves its readings.
        """
        updated = []
        now_dt = datetime.now()
        now_str = now_dt.strftime("%H:%M:%S")

        for m in self.machines:
            # Check for active real hardware telemetry
            last_ping = m.get("last_hardware_ping")
            is_hardware_active = False
            if last_ping and m.get("connection_status") == "HARDWARE_CONNECTED":
                try:
                    ping_dt = datetime.fromisoformat(last_ping)
                    if (now_dt - ping_dt).total_seconds() < 45:
                        is_hardware_active = True
                except Exception:
                    pass

            if is_hardware_active:
                m["telemetry_source"] = "HARDWARE"
                m["connection_status"] = "HARDWARE_CONNECTED"
                updated.append(m)
                continue

            # Simulation mode
            m["telemetry_source"] = "SIMULATED"
            m["connection_status"] = "SIMULATED"
            curr = dict(m.get("readings", {}))
            sensor_defs = {s["key"]: s for s in m.get("sensor_definitions", [])}
            new_readings = {}

            # Update all configured sensor fields dynamically
            for k, val in curr.items():
                s_def = sensor_defs.get(k, {})
                min_v = float(s_def.get("min", 0.0))
                max_v = float(s_def.get("max", 99999.0))
                
                try:
                    num_val = float(val)
                except (ValueError, TypeError):
                    new_readings[k] = val
                    continue

                if k == "air_temperature_k":
                    delta = random.choice([-0.2, 0.0, 0.1, 0.2])
                    new_val = round(max(min_v or 295.0, min(max_v or 305.0, num_val + delta)), 1)
                elif k == "process_temperature_k":
                    delta = random.choice([-0.2, 0.0, 0.1, 0.2])
                    new_val = round(max(min_v or 305.0, min(max_v or 315.0, num_val + delta)), 1)
                elif k == "rotational_speed_rpm":
                    delta = random.choice([-15, -8, 0, 7, 12])
                    new_val = int(max(min_v or 1050, min(max_v or 2600, num_val + delta)))
                elif k == "torque_nm":
                    delta = random.choice([-1.2, -0.4, 0.2, 0.8])
                    new_val = round(max(min_v or 15.0, min(max_v or 75.0, num_val + delta)), 1)
                elif k == "tool_wear_min":
                    wear_inc = 1 if random.random() > 0.65 else 0
                    new_val = min(int(max_v or 245), int(num_val) + wear_inc)
                else:
                    # Dynamic walk for custom configured sensor parameters
                    span = (max_v - min_v) if max_v > min_v else 10.0
                    step_pct = random.uniform(-0.015, 0.015)
                    delta = span * step_pct
                    new_val = round(max(min_v, min(max_v, num_val + delta)), 2)

                new_readings[k] = new_val

            m["readings"] = new_readings
            m["history"].append({
                "timestamp": now_str,
                **new_readings
            })
            if len(m["history"]) > 30:
                m["history"].pop(0)
            updated.append(m)

        return updated

data_manager = MachineDataManager()
