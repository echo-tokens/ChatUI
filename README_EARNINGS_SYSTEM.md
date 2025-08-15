# Echo Earnings System - Frontend Implementation

## Overview

A comprehensive frontend system for user rebate and payout management, integrated with Stripe Connect for secure payments. Users can track earnings, manage trust levels, and cash out through multiple payout rails.

## Features

### 🎯 Core Functionality
- **Real-time earnings tracking** with WebSocket integration
- **Multi-tier trust system** (Levels 1-5) with progressive benefits
- **Dual payout methods**: ACH transfers and instant payouts
- **45-day hold period** for advertiser refund protection
- **Transaction history** with filtering and export
- **Stripe Connect integration** for secure banking

### 💰 Revenue Share Structure
- **Level 1 (New)**: 70% user share, $5 min payout, $200 daily limit
- **Level 2 (Active)**: 75% user share, $3 min payout, $300 daily limit  
- **Level 3 (Trusted)**: 85% user share, $2 min payout, $500 daily limit
- **Level 4 (Elite)**: 90% user share, $1 min payout, $1000 daily limit
- **Level 5 (Partner)**: 95% user share, no min payout, unlimited daily

### 🏦 Payout Options
- **ACH Bank Transfer**: $0.25 fixed fee, 1-3 business days
- **Instant Payout**: $0.50 + 1.5% fee, within 30 minutes

## Component Architecture

```
src/components/Earnings/
├── index.ts                 # Export all components
├── EarningsDashboard.tsx    # Main container component
├── EarningsCard.tsx         # Balance display with stats
├── TransactionTable.tsx     # Sortable transaction history
├── CashOutModal.tsx         # Multi-step payout flow
├── TrustBadge.tsx          # Trust level indicator
├── StripeSetupFlow.tsx     # Onboarding flow
├── PayoutRailSelector.tsx  # Payment method selection
└── FeeStructureInfo.tsx    # Educational content
```

## Usage

### Basic Setup

```tsx
import { EarningsDashboard } from '~/components/Earnings';

function EarningsPage() {
  return <EarningsDashboard user={user} />;
}
```

### Individual Components

```tsx
import { 
  EarningsCard, 
  TrustBadge, 
  CashOutModal 
} from '~/components/Earnings';

function CustomEarningsView() {
  return (
    <div>
      <TrustBadge level={user.trust_level} />
      <EarningsCard balance={balance} stats={stats} />
      <CashOutModal 
        isOpen={showModal}
        availableBalance={balance.available}
        onSubmitPayout={handlePayout}
      />
    </div>
  );
}
```

### Real-time Updates

```tsx
import { useRealtimeEarnings } from '~/hooks/useRealtimeEarnings';

function EarningsComponent() {
  const { data, isConnected, lastUpdate } = useRealtimeEarnings({
    userId: user.id,
    enabled: true
  });
  
  return (
    <div>
      <div>Status: {isConnected ? 'Connected' : 'Disconnected'}</div>
      <div>Last update: {lastUpdate?.toLocaleTimeString()}</div>
      <EarningsCard balance={data?.balance} stats={data?.stats} />
    </div>
  );
}
```

## Data Flow

### 1. User State Management
```typescript
interface User {
  id: string;
  email: string;
  stripe_account_id?: string;
  trust_level: number; // 1-5
  kyc_status: 'none' | 'pending' | 'verified';
  created_at: string;
  updated_at: string;
}
```

### 2. Balance Tracking
```typescript
interface UserBalance {
  estimated: number;    // pending credits (45-day hold)
  confirmed: number;    // confirmed but not paid
  paid: number;         // lifetime paid out
  available: number;    // confirmed - minimum_payout_threshold
}
```

### 3. Transaction Records
```typescript
interface LedgerEntry {
  id: string;
  user_id: string;
  amount_usd: number;
  direction: 'credit' | 'debit';
  state: 'pending' | 'confirmed' | 'paid' | 'reversed';
  risk_hold_pct: number;
  ref_type: 'conversion' | 'payout' | 'reserve' | 'adjustment';
  ref_id?: string;
  created_at: string;
  confirmed_at?: string;
  paid_at?: string;
  description?: string;
}
```

## Backend Integration Points

### Required API Endpoints
```typescript
// User management
GET /api/users/me/earnings          // Get user earnings data
POST /api/users/me/stripe-setup     // Initialize Stripe Connect
PUT /api/users/me/trust-level       // Update trust level

// Transactions
GET /api/transactions               // Get transaction history
POST /api/payouts                   // Request payout
GET /api/payouts/:id/status         // Check payout status

// Real-time
WebSocket /ws/earnings/:userId      // Real-time updates
```

### Supabase Schema
```sql
-- Users table (extend existing)
ALTER TABLE users ADD COLUMN stripe_account_id TEXT;
ALTER TABLE users ADD COLUMN trust_level SMALLINT DEFAULT 1;
ALTER TABLE users ADD COLUMN kyc_status TEXT DEFAULT 'none';

-- Ledger entries
CREATE TABLE ledger_entries (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  amount_usd NUMERIC(12,4) NOT NULL,
  direction TEXT CHECK (direction IN ('credit','debit')),
  state TEXT CHECK (state IN ('pending','confirmed','paid','reversed')),
  risk_hold_pct NUMERIC(4,3) DEFAULT 0.02,
  ref_type TEXT,
  ref_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ
);

-- Daily point rates
CREATE TABLE daily_point_rates (
  day DATE PRIMARY KEY,
  points_issued NUMERIC(20,4),
  pool_usd NUMERIC(20,4),
  usd_per_point NUMERIC(20,10)
);
```

## Key Features

### 1. Trust Level System
- **Progressive Benefits**: Higher levels unlock better revenue shares
- **Visual Indicators**: Color-coded badges with tooltips
- **Requirement Tracking**: Clear progression paths
- **Automatic Calculation**: Based on earnings, conversions, and KYC status

### 2. Stripe Connect Integration
- **Secure Onboarding**: Identity verification and bank account linking
- **Multiple Payout Rails**: ACH and instant transfers
- **Fee Transparency**: Clear fee structure display
- **Account Management**: Direct links to Stripe dashboard

### 3. Smart Cash-Out Flow
- **Amount Validation**: Minimum thresholds and balance checks
- **Method Selection**: Automatic fee calculation
- **Confirmation Step**: Clear summary before processing
- **Success Tracking**: Transaction history updates

### 4. Real-time Updates
- **WebSocket Connection**: Live balance updates
- **New Transaction Notifications**: Instant feedback
- **Connection Status**: Visual indicators
- **Automatic Reconnection**: Robust connection handling

## Security Considerations

### Frontend Security
- **Type Safety**: Comprehensive TypeScript types
- **Input Validation**: Client-side validation with server confirmation
- **Secure Redirects**: Validated external links
- **State Management**: Immutable state updates

### Financial Data Protection
- **No Sensitive Storage**: Banking details handled by Stripe
- **Encrypted Communication**: HTTPS for all requests
- **Session Management**: Secure user authentication
- **Audit Trail**: Complete transaction logging

## Testing Strategy

### Component Testing
```typescript
// Example test for EarningsCard
import { render, screen } from '@testing-library/react';
import { EarningsCard } from './EarningsCard';

test('displays balance correctly', () => {
  const mockBalance = {
    estimated: 10.50,
    confirmed: 25.00,
    paid: 100.00,
    available: 25.00
  };
  
  render(<EarningsCard balance={mockBalance} stats={mockStats} />);
  
  expect(screen.getByText('$10.50')).toBeInTheDocument();
  expect(screen.getByText('$25.00')).toBeInTheDocument();
});
```

### Integration Testing
- **Stripe Connect Flow**: End-to-end onboarding
- **Payout Processing**: Complete cash-out journey
- **Real-time Updates**: WebSocket connection handling
- **Error Scenarios**: Network failures and edge cases

## Performance Optimizations

### Code Splitting
```typescript
// Lazy load earnings components
const EarningsDashboard = lazy(() => import('./EarningsDashboard'));
const CashOutModal = lazy(() => import('./CashOutModal'));
```

### Memoization
```typescript
// Optimize expensive calculations
const formattedBalance = useMemo(() => {
  return formatCurrency(balance.total);
}, [balance.total]);
```

### Virtual Scrolling
- **Transaction Table**: Handle large datasets efficiently
- **Infinite Loading**: Progressive data fetching
- **Optimized Rendering**: Only render visible rows

## Deployment Checklist

### Environment Variables
```bash
# Required for production
STRIPE_PUBLISHABLE_KEY=pk_live_...
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=eyJ...
WEBSOCKET_URL=wss://...
```

### Feature Flags
```typescript
// Gradual rollout capability
const EARNINGS_FEATURE_ENABLED = process.env.REACT_APP_EARNINGS_ENABLED === 'true';
```

### Monitoring
- **Error Tracking**: Sentry integration for production errors
- **Analytics**: User engagement with earnings features
- **Performance**: Real-time update latency monitoring
- **Business Metrics**: Conversion rates and payout volumes

## Future Enhancements

### Planned Features
- **Mobile App**: React Native components
- **Advanced Analytics**: Earnings projections and trends
- **Tax Integration**: Automated 1099 generation
- **Referral System**: Multi-level earning opportunities
- **API Access**: Developer tools for advanced users

### Scalability Improvements
- **Micro-frontend Architecture**: Independent deployments
- **CDN Integration**: Global asset delivery
- **Database Sharding**: Handle millions of transactions
- **Event Sourcing**: Immutable transaction logs

## Support & Documentation

### User Help
- **In-app Tooltips**: Contextual guidance
- **FAQ Integration**: Common questions answered
- **Video Tutorials**: Step-by-step walkthroughs
- **Support Chat**: Real-time assistance

### Developer Resources
- **API Documentation**: OpenAPI specifications
- **Code Examples**: Integration patterns
- **Best Practices**: Security and performance guides
- **Community Forum**: Developer discussions

---

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set Environment Variables**
   ```bash
   cp .env.example .env.local
   # Fill in your Stripe and Supabase credentials
   ```

3. **Run Development Server**
   ```bash
   npm run dev
   ```

4. **Navigate to Earnings**
   ```
   http://localhost:3000/earnings
   ```

The system is designed to be production-ready with comprehensive error handling, security measures, and user experience optimizations. All components are fully typed and follow established React patterns for maintainability and scalability. 