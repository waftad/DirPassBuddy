import { Observable } from '@nativescript/core';
import { supabase } from '../../services/supabase';

export class LoginViewModel extends Observable {
  email: string = '';
  password: string = '';

  constructor() {
    super();
  }

  async onLogin() {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: this.email,
        password: this.password
      });

      if (error) throw error;

      // Navigate to main dashboard
      const frame = require('@nativescript/core').Frame;
      frame.topmost().navigate({
        moduleName: 'pages/dashboard/dashboard-page',
        clearHistory: true
      });
    } catch (error) {
      console.error('Login error:', error.message);
      // Show error dialog
    }
  }

  onRegister() {
    const frame = require('@nativescript/core').Frame;
    frame.topmost().navigate('pages/auth/register');
  }
}