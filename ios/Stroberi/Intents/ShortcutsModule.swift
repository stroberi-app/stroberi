import Foundation

@objc(ShortcutsModule)
class ShortcutsModule: NSObject {

    @objc
    func testLogTransaction(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        let baseCurrency = IntentDatabaseHelper.readBaseCurrency()
        let now = Date().timeIntervalSince1970 * 1000
        let transactionId = UUID().uuidString.lowercased()

        let success = IntentDatabaseHelper.insertTransaction(
            id: transactionId,
            merchant: "Test Transaction",
            amount: -1.00,
            date: now,
            currencyCode: baseCurrency,
            baseCurrencyCode: baseCurrency,
            amountInBaseCurrency: -1.00,
            exchangeRate: 1.0,
            conversionStatus: "ok"
        )

        if success {
            resolve("Test transaction created successfully")
        } else {
            reject("E_DB_WRITE", "Failed to write test transaction", nil)
        }
    }

    @objc
    static func requiresMainQueueSetup() -> Bool {
        return false
    }
}
