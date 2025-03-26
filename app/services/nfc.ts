import { Nfc } from '@nativescript/nfc';

export class NfcService {
  private nfc: Nfc;

  constructor() {
    this.nfc = new Nfc();
  }

  async isEnabled(): Promise<boolean> {
    return await this.nfc.enabled();
  }

  async startScanning() {
    return new Promise((resolve, reject) => {
      this.nfc.setOnNdefDiscoveredListener((data: any) => {
        resolve(data);
      }, reject);
    });
  }

  async checkInUser(userId: string, tagId: string) {
    // Handle check-in logic with Supabase
    const { data, error } = await supabase
      .from(Tables.TRAIL_CHECKINS)
      .insert({
        user_id: userId,
        tag_id: tagId,
        check_in_time: new Date()
      });

    if (error) throw error;
    return data;
  }
}