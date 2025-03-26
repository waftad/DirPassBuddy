import { Observable } from '@nativescript/core';
import { getCurrentUser, signOut } from '../../services/supabase';
import { PassService } from '../../services/passes';
import { StoreService } from '../../services/store';
import { ClassifiedsService } from '../../services/classifieds';
import { NfcService } from '../../services/nfc';
import { enableLocationServices, watchLocation } from '../../services/location';

export class DashboardViewModel extends Observable {
  private passService: PassService;
  private storeService: StoreService;
  private classifiedsService: ClassifiedsService;
  private nfcService: NfcService;

  constructor() {
    super();

    this.passService = new PassService();
    this.storeService = new StoreService();
    this.classifiedsService = new ClassifiedsService();
    this.nfcService = new NfcService();

    this.initializeServices();
    this.loadData();
  }

  private async initializeServices() {
    // Enable location services
    await enableLocationServices();

    // Start location tracking
    watchLocation((location) => {
      this.set('currentLocation', location);
    });

    // Initialize NFC if available
    const nfcEnabled = await this.nfcService.isEnabled();
    if (nfcEnabled) {
      this.nfcService.startScanning();
    }
  }

  private async loadData() {
    const user = await getCurrentUser();
    this.set('user', user);

    // Load products
    const products = await this.storeService.getProducts();
    this.set('products', products);

    // Load classifieds
    const classifieds = await this.classifiedsService.getListings();
    this.set('classifieds', classifieds);
  }

  async onCheckInOut() {
    try {
      const tagData = await this.nfcService.startScanning();
      await this.nfcService.checkInUser(this.user.id, tagData.id);
      // Update UI
    } catch (error) {
      console.error('Check-in error:', error);
    }
  }

  async onSosAlert() {
    // Implement SOS alert logic
    const location = this.get('currentLocation');
    // Send alert to park administration with location
  }

  async onPurchasePass() {
    try {
      await this.passService.purchasePass({
        userId: this.user.id,
        passType: 'day',
        paymentMethodId: 'pm_card_visa'
      });
      // Update UI
    } catch (error) {
      console.error('Purchase error:', error);
    }
  }

  async onSignOut() {
    await signOut();
    const frame = require('@nativescript/core').Frame;
    frame.topmost().navigate({
      moduleName: 'pages/auth/login',
      clearHistory: true
    });
  }

  // Additional methods for store and classifieds functionality
}