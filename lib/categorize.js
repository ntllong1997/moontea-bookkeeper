function has(str, ...terms) {
    const u = str.toUpperCase();
    return terms.some((t) => u.includes(t.toUpperCase()));
}

function hasAll(str, ...terms) {
    const u = str.toUpperCase();
    return terms.every((t) => u.includes(t.toUpperCase()));
}

// amount: raw Plaid amount — positive = money OUT, negative = money IN
export function categorizeTransaction(merchantName, amount) {
    const d = (merchantName || '').toUpperCase();
    const s = (...terms) => has(d, ...terms);
    const a = (...terms) => hasAll(d, ...terms);
    const moneyIn = typeof amount === 'number' && amount < 0;

    // ── Credit Card Payments (checking → card) ───────────────────────────────
    if (s('BANK OF AMERICA CREDIT CARD'))                        return 'Credit Card Payment';
    if (a('ONLINE BANKING', 'CRD'))                              return 'Credit Card Payment';
    if (a('ONLINE BANKING PAYMENT', 'CRD'))                      return 'Credit Card Payment';
    // Discover/Amex/1st BankCard payments out from checking = credit card payment
    if (s('DISCOVER') && s('E-PAYMENT'))                         return 'Credit Card Payment';
    if (s('AMERICAN EXPRESS') && (s('ACH PMT') || s('PAYMENT'))) return 'Credit Card Payment';
    if (s('1ST BANKCARD') && s('CR CRD PMT'))                    return 'Credit Card Payment';

    // ── Platform payouts (money IN from delivery/POS platforms) ──────────────
    // Same vendors can appear as both payouts (deposit) and fees (withdrawal)
    if (s('DOORDASH', 'DOOR DASH') && moneyIn)                   return 'Online Sales';
    if (s('GRUBHUB') && moneyIn)                                 return 'Online Sales';
    if (s('SQUARE') && moneyIn)                                  return 'Online Sales';
    if (s('MENUSIFU') && moneyIn)                                return 'Online Sales';
    if (s('UBER') && s('PARTNER') && moneyIn)                    return 'Online Sales';
    if (s('MERCHANT SERVICE') && s('MERCH DEP'))                 return 'Deposit';

    // ── Vendors / Ingredients ────────────────────────────────────────────────
    if (s('RESTAURANT DEPOT'))                                   return 'Restaurant Depot';
    if (s("SAM'S CLUB", 'SAMS CLUB', 'NEW SAMS.COM', 'SAMS.COM')) return "Sam's Club";
    if (s('COSTCO'))                                             return 'Costco';
    if (s('TAN BINH'))                                           return 'Tan Binh';
    if (s('VIET HOA'))                                           return 'Viet Hoa';
    if (s('WEBSTAURANT'))                                        return 'Webstaurant';
    if (s('FIRST BANK') || (s('1ST BANKCARD') && !s('CR CRD PMT'))) return 'Webstaurant';
    if (s('AMAZON', 'AMZ'))                                      return 'Amazon';
    if (s('JUNIORS SUPERMARKET'))                                return 'Juniors Supermarket';
    if (s('LOLLICUP'))                                           return 'Lollicup';
    if (s('BOSSEN') || s('ZELLE PAYMENT TO BOSSEN'))             return 'Bossen';
    if (s('HMART'))                                              return 'HMart';
    if (s('HONG KONG', 'HONGKONG'))                              return 'Hong Kong Market';
    if (s('VEGEMARKET'))                                         return 'VegeMarket';
    if (s('SUNS CLUB', 'SUNS WHOLESALE'))                        return "Sun's Wholesale";
    if (s('KINGSEAL'))                                           return 'KingSeal';
    if (s('WB LIQUORS'))                                         return 'Alcohol';
    if (s('CAMBIE'))                                             return 'Cambie';
    if (s('ICE DEPOT'))                                          return 'Supplies';

    // ── Office / Business Supplies ───────────────────────────────────────────
    if (s('OFFICE DEPOT'))                                       return 'Office Depot';
    if (s('ALIEXPRESS'))                                         return 'AliExpress';
    if (s('NAYAX', 'WEEE!', 'WEEE'))                             return 'Supplies';
    if (s('HOBBY-LOBBY', 'HOBBY LOBBY', 'ROSS STORES'))          return 'Decorations & Ambience';
    if (s('DOLLARTREE'))                                         return 'Maintenance';

    // ── Grocery / Big Box ────────────────────────────────────────────────────
    if (s('KEITH'))                                              return 'Ben E. Keith';
    if (s('WALMART', 'WAL-MART') || a(' WM '))                   return 'Walmart';
    if (s('H-E-B', 'HEB'))                                       return 'HEB';
    if (s('TARGET'))                                             return 'Target';

    // ── Utilities ────────────────────────────────────────────────────────────
    if (s('U.S. RETAILERS', 'NRG'))                              return 'Electricity';
    if (s('SPECTRUM'))                                           return 'Spectrum';
    if (s('TEXAS GAS'))                                          return 'Texas Gas';
    if (s('AT&T', 'ATT'))                                        return 'AT&T';

    // ── Maintenance / Repair ─────────────────────────────────────────────────
    if (s('HOME DEPOT', 'HOMEDEPOT.COM'))                        return 'Home Depot';
    if (s("LOWE'S", 'LOWES'))                                    return "Lowe's";
    if (s('LOCKSMITH', 'WATERDOCTOR', 'WAYFAIR', 'LITFAD'))      return 'Maintenance';

    // ── Software / Subscriptions ─────────────────────────────────────────────
    if (s('QUICKBOOKS'))                                         return 'QuickBooks';
    if (s('OPENAI'))                                             return 'OpenAI';
    if (s('CLAUDE') || s('ANTHROPIC'))                           return 'Claude';
    if (s('APPLE'))                                              return 'Apple';
    if (s('TRUFIT'))                                             return 'Subscription';

    // ── Insurance ────────────────────────────────────────────────────────────
    if (s('GEICO'))                                              return 'GEICO';
    if (s('HARTFORD'))                                           return 'Hartford';
    if (s('ADT'))                                                return 'ADT Security';

    // ── Marketing ────────────────────────────────────────────────────────────
    if (s('FACE'))                                               return 'Facebook/Meta';

    // ── Transportation / Fuel ────────────────────────────────────────────────
    if (s('UBER'))                                               return 'Uber';
    if (s('U-HAUL'))                                             return 'U-Haul';
    if (s('ENTERPRISE RENT'))                                    return 'Enterprise';
    if (s('AUTOZONE'))                                           return 'AutoZone';
    if (s('BLUEWAVE'))                                           return 'BlueWave';
    if (s('BUC-EE', 'BUCEES'))                                   return "Buc-ee's";
    if (s('LOVE'))                                               return "Love's";
    if (s('PHILLIPS'))                                           return 'Phillips 66';
    if (s('SHELL'))                                              return 'Shell';
    if (s('TEXAN'))                                              return 'Texan';
    if (s('7-ELEVEN'))                                           return '7-Eleven';
    if (s('CIRCLE K'))                                           return 'Circle K';
    if (s('EXXON'))                                              return 'Exxon';
    if (s('BOOKING'))                                            return 'Booking/Hotel';

    // ── Printing / Shipping ──────────────────────────────────────────────────
    if (s('WALGREENS', 'USPS', 'UPS'))                           return 'Printing';

    // ── Meals ────────────────────────────────────────────────────────────────
    if (s('CSC SERVICEWORK', 'DAIRY QUEEN', 'GORDITAS Y TACOS EL CH',
          'MCDONALDS', 'DOMINO', 'KOT POT', 'CREAMERY', 'STARBUCK',
          'BIJOU', 'CRUMBL', 'CVS', 'FOOD'))                     return 'Meal';

    // ── Uniform ──────────────────────────────────────────────────────────────
    if (s('CROCS', 'NIKE', 'SHEIN'))                             return 'Uniform';

    // ── Regulatory / Fees ────────────────────────────────────────────────────
    if (s('TDLR'))                                               return 'TDLR';
    if (s('FOODHANDLER'))                                        return 'Food Handler';
    if (s('CITY OF EDINBURG'))                                   return 'City of Edinburg';
    if (s('GREATER PHA'))                                        return 'Greater PHA';
    if (s('MCALLEN TX'))                                         return 'McAllen TX';
    if (s('THETOUCHON'))                                         return 'The Touch On';
    if (s('STX', 'RGV ASIAN', 'THRIVE CURATED', 'WESLACO EDC')) return 'Event Vendor Fees';
    if (s('CPA TEXAS TAX') || s('WEBFILE'))                      return 'Sales Tax';
    if (s('MONTHLY FEE BUSINESS'))                               return 'Bank Fee';
    if (s('MERCH FEE'))                                          return 'Merchant Fee';

    // ── Payroll ──────────────────────────────────────────────────────────────
    if (a('ADP', 'WAGE') || a('CHECK', 'PAYROLL') || a('INTUIT', 'PAYROLL')) return 'Payroll';
    if (a('ADP', 'TAX') || a('INTUIT', 'TAX'))                   return 'Payroll Tax';
    if (a('ADP', 'FEE'))                                         return 'Payroll Fee';

    // Check #1055 to CAGE PLAZA = Rent ($2,300)
    if (s('CHECK') && typeof amount === 'number' && Math.abs(amount) === 2300) return 'Rent';
    if (s('RENT'))                                               return 'Rent';

    // ── Banking / Transfers ──────────────────────────────────────────────────
    if (s('WEALTHFRONT') || a('ZELLE', 'WITHDRAW') ||
        s('ZELLE RECURRING PAYMENT TO THANH LONG NGUYEN'))       return 'Owner Withdraw';
    if (a('ZELLE', 'FROM'))                                      return 'Online Sales';
    if (s('COUNTER CREDIT'))                                     return 'Cash Deposit';
    if (s('MERCH DEP', 'DEPOSIT'))                               return 'Deposit';

    // ── POS / Delivery Platforms (fees/withdrawals) ──────────────────────────
    if (s('SQUARE'))                                             return 'Square';
    if (s('DOORDASH', 'DOOR DASH'))                              return 'DoorDash';
    if (s('GRUBHUB'))                                            return 'Grubhub';
    if (s('MENUSIFU'))                                           return 'Menusifu';
    if (s('AMERICAN EXPRESS'))                                   return 'Amex';
    if (s('DISCOVER'))                                           return 'Discover';

    return 'Other/Review';
}
