# @umituz/react-native-credits

Credits management system for React Native apps - Database-first approach with secure validation

## Features

- ✅ Database-first approach (works with any database)
- ✅ Centralized state management with Zustand
- ✅ Type-safe with TypeScript
- ✅ Domain-Driven Design (DDD) architecture
- ✅ SOLID, DRY, KISS principles
- ✅ Secure validation (user ID verification)
- ✅ Atomic transactions support
- ✅ Credit logging system

## Installation

```bash
npm install @umituz/react-native-credits zustand
```

## Usage

### 1. Implement Credits Repository

```typescript
import { ICreditsRepository, CreditsBalance, CreditLog } from '@umituz/react-native-credits';

class MyCreditsRepository implements ICreditsRepository {
  async getBalance(userId: string): Promise<CreditsBalance | null> {
    // Implement your database logic
  }

  async updateBalance(userId: string, newBalance: number): Promise<CreditsBalance> {
    // Implement atomic transaction
  }

  async addCredits(userId: string, amount: number): Promise<CreditsBalance> {
    // Implement atomic transaction
  }

  async deductCredits(userId: string, amount: number): Promise<CreditsBalance> {
    // Implement atomic transaction with validation
  }

  async logTransaction(log: CreditLog): Promise<void> {
    // Implement logging
  }
}
```

### 2. Use Credits Hook

```typescript
import { useCredits } from '@umituz/react-native-credits';
import { useAuth } from '@domains/auth';

function MyComponent() {
  const { userId } = useAuth();
  const repository = new MyCreditsRepository();
  
  const { credits, loading, loadCredits, checkCredits } = useCredits({
    userId,
    repository,
  });

  const canAfford = checkCredits(100);

  return (
    <View>
      <Text>Credits: {credits ?? 0}</Text>
      <Button onPress={loadCredits} title="Refresh" />
    </View>
  );
}
```

### 3. Direct Store Access (Optional)

```typescript
import { useCreditsStore } from '@umituz/react-native-credits';

// Get credits directly
const credits = useCreditsStore((state) => state.credits);

// Update credits
useCreditsStore.getState().setCredits(1000);
```

## Architecture

- **Domain Layer**: Entities and repository interfaces
- **Infrastructure Layer**: Zustand store implementation
- **Presentation Layer**: React hooks

## License

MIT

