import { Observable } from '@nativescript/core';
import { supabase, Tables } from '../../services/supabase';
import { StoreService } from '../../services/store';

export class AdminDashboardViewModel extends Observable {
  private storeService: StoreService;
  private realtimeSubscription: any;

  constructor() {
    super();
    this.storeService = new StoreService();
    this.initializeData();
    this.setupRealtimeSubscription();
  }

  private async initializeData() {
    await this.loadActiveRiders();
    await this.loadInventory();
    await this.loadSalesData();
  }

  private async loadActiveRiders() {
    const { data: riders } = await supabase
      .from(Tables.TRAIL_CHECKINS)
      .select(`
        *,
        users (
          id,
          name,
          profile_picture
        )
      `)
      .is('check_out_time', null);

    this.set('activeRidersList', riders);
    this.set('activeRiders', riders?.length || 0);
  }

  private async loadInventory() {
    const products = await this.storeService.getProducts();
    this.set('inventory', products);
  }

  private async loadSalesData() {
    // Load daily sales
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: dailySales } = await supabase
      .from(Tables.ORDERS)
      .select('total')
      .gte('order_date', today.toISOString());

    const totalDailySales = dailySales?.reduce((sum, order) => sum + order.total, 0) || 0;
    this.set('dailySales', totalDailySales);

    // Load pass sales
    const { data: passSales } = await supabase
      .from(Tables.PASSES)
      .select('type')
      .gte('purchase_date', today.toISOString());

    this.set('passSales', passSales?.length || 0);
  }

  private setupRealtimeSubscription() {
    this.realtimeSubscription = supabase
      .channel('admin-dashboard')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: Tables.TRAIL_CHECKINS
      }, () => {
        this.loadActiveRiders();
      })
      .subscribe();
  }

  async onUpdateStock(args: any) {
    const product = args.object.bindingContext;
    // Show dialog to update stock
    // Update stock using storeService
  }

  async onAddProduct() {
    // Navigate to add product page
  }

  async onExportReports() {
    // Generate and export reports
  }

  ngOnDestroy() {
    if (this.realtimeSubscription) {
      supabase.removeChannel(this.realtimeSubscription);
    }
  }
}