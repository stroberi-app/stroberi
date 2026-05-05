// ios/Stroberi/Intents/LogTransactionIntent.swift
import AppIntents
import Foundation

@available(iOS 16, *)
struct LogTransactionIntent: AppIntent {
    static var title: LocalizedStringResource = "Log Transaction"
    static var description = IntentDescription(
        "Log a transaction in Stroberi"
    )
    static var openAppWhenRun: Bool = false

    // Accepting Amount as a String (not Double) lets the user map Apple's raw
    // `Amount` variable directly — it arrives as a formatted string like
    // "£12.40" or "50,00 RSD", with the currency symbol embedded. We parse out
    // both the numeric value and, when unambiguous, the currency code.
    @Parameter(title: "Amount")
    var amount: String

    @Parameter(title: "Merchant")
    var merchant: String

    func perform() async throws -> some IntentResult & ReturnsValue<String> {
        let baseCurrency = IntentDatabaseHelper.readBaseCurrency()

        guard let parsed = IntentDatabaseHelper.parseAmountText(amount) else {
            throw LogTransactionError.invalidAmount
        }

        let expenseAmount = -abs(parsed.amount)
        let transactionCurrency = parsed.currencyCode ?? baseCurrency

        // Resolve exchange rate if the transaction currency differs from base.
        let exchangeRate: Double
        let amountInBaseCurrency: Double
        let conversionStatus: String

        if transactionCurrency == baseCurrency {
            exchangeRate = 1.0
            amountInBaseCurrency = expenseAmount
            conversionStatus = "ok"
        } else if let rate = IntentDatabaseHelper.fetchExchangeRate(
            from: transactionCurrency, to: baseCurrency
        ) {
            exchangeRate = rate
            amountInBaseCurrency = expenseAmount * rate
            conversionStatus = "ok"
        } else {
            exchangeRate = 1.0
            amountInBaseCurrency = expenseAmount
            conversionStatus = "missing_rate"
        }

        let now = Date().timeIntervalSince1970 * 1000 // ms timestamp
        let transactionId = UUID().uuidString.lowercased()

        let success = IntentDatabaseHelper.insertTransaction(
            id: transactionId,
            merchant: merchant,
            amount: expenseAmount,
            date: now,
            currencyCode: transactionCurrency,
            baseCurrencyCode: baseCurrency,
            amountInBaseCurrency: amountInBaseCurrency,
            exchangeRate: exchangeRate,
            conversionStatus: conversionStatus
        )

        if success {
            let formatted = String(format: "%.2f", abs(parsed.amount))
            return .result(value: "Logged \(transactionCurrency) \(formatted) at \(merchant)")
        } else {
            throw LogTransactionError.databaseWriteFailed
        }
    }
}

@available(iOS 16, *)
enum LogTransactionError: Swift.Error, CustomLocalizedStringResourceConvertible {
    case databaseWriteFailed
    case invalidAmount

    var localizedStringResource: LocalizedStringResource {
        switch self {
        case .databaseWriteFailed:
            return "Failed to save the transaction. Please open Stroberi and try again."
        case .invalidAmount:
            return "Couldn't read the transaction amount. Make sure the Amount variable is mapped from the Transaction trigger."
        }
    }
}
