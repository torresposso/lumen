import type { ConsultationStore } from "../storage/consultation-store";
import type { ProfileStore } from "./profile-store";

export interface CliContext {
	profiles: ProfileStore;
	consultations: ConsultationStore;
}
