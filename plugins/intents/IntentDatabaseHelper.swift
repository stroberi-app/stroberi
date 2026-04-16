import Foundation
import SQLite3

struct IntentDatabaseHelper {

    private static let SQLITE_TRANSIENT = unsafeBitCast(-1, to: sqlite3_destructor_type.self)

    // Must stay in sync with data/currencies.ts — Intl.NumberFormat in the
    // JS layer rejects codes outside this set, which would crash the app
    // when rendering the offending transaction.
    private static let supportedCurrencyCodes: Set<String> = [
        "USD", "EUR", "GBP", "JPY", "CNY", "RUB", "INR", "BRL", "MXN", "AUD",
        "CAD", "CHF", "ZAR", "SEK", "NOK", "KRW", "TRY", "NZD", "SGD", "HKD",
        "PLN", "DKK", "HUF", "CZK", "ILS", "CLP", "PHP", "AED", "COP", "SAR",
        "MYR", "RON", "IDR", "THB", "RSD", "BAM"
    ]

    // Unambiguous symbol → ISO-4217 code. Excludes "$" and "kr" because they're
    // shared across multiple currencies (USD/CAD/AUD/NZD/SGD/HKD/..., SEK/NOK/DKK).
    // For those we fall back to the user's base currency.
    private static let unambiguousSymbols: [(symbol: String, code: String)] = [
        ("R$", "BRL"),    // must be matched before plain "$"
        ("£", "GBP"),
        ("€", "EUR"),
        ("₹", "INR"),
        ("₺", "TRY"),
        ("₩", "KRW"),
        ("₪", "ILS"),
        ("₱", "PHP"),
        ("₽", "RUB"),
        ("zł", "PLN"),
        ("Ft", "HUF"),
        ("Kč", "CZK"),
        ("Rp", "IDR"),
        ("฿", "THB"),
        ("¥", "JPY"),     // ambiguous with CNY but JPY is the overwhelming default
    ]

    // MARK: - Currency Validation

    /// Returns an uppercased, trimmed ISO-4217 code if supported, otherwise nil.
    static func normalizedCurrencyCode(_ input: String?) -> String? {
        guard let raw = input else { return nil }
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        guard !trimmed.isEmpty, supportedCurrencyCodes.contains(trimmed) else { return nil }
        return trimmed
    }

    /// WatermelonDB's localStorage wraps values with `JSON.stringify`, so a string
    /// "RSD" lands on disk as the 5-char sequence `"RSD"`. Peel off the JSON wrapper
    /// if present; fall back to the raw value otherwise.
    static func unwrapJSONString(_ raw: String) -> String {
        guard let data = raw.data(using: .utf8) else { return raw }
        if let decoded = try? JSONSerialization.jsonObject(
            with: data, options: [.fragmentsAllowed]
        ) as? String {
            return decoded
        }
        return raw
    }

    // MARK: - Amount Text Parsing

    /// Parses the formatted Amount string that iOS Shortcuts' Transaction trigger
    /// exposes (e.g. "£12.40", "50,00 RSD", "$12.34"). Returns the numeric value
    /// and, when unambiguously detectable, the ISO-4217 currency code.
    static func parseAmountText(_ text: String) -> (amount: Double, currencyCode: String?)? {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return nil }

        // 1. Detect a 3-letter ISO code if present (case-insensitive, word-bounded).
        var detectedCode: String? = nil
        if let range = trimmed.range(
            of: #"(?i)\b[A-Za-z]{3}\b"#, options: .regularExpression
        ) {
            let candidate = String(trimmed[range]).uppercased()
            if supportedCurrencyCodes.contains(candidate) {
                detectedCode = candidate
            }
        }

        // 2. Otherwise look for an unambiguous currency symbol.
        if detectedCode == nil {
            for entry in unambiguousSymbols where trimmed.contains(entry.symbol) {
                detectedCode = entry.code
                break
            }
        }

        guard let amount = parseNumericPortion(trimmed) else { return nil }
        return (amount, detectedCode)
    }

    /// Extracts a Double from a string that may be surrounded by currency symbols /
    /// codes and that may use either "." or "," as the decimal separator.
    private static func parseNumericPortion(_ text: String) -> Double? {
        // Keep only digits and separators; drop everything else (symbols, letters, spaces).
        let kept = text.filter { ch in
            ch.isNumber || ch == "." || ch == "," || ch == "-"
        }
        guard !kept.isEmpty else { return nil }

        let dotCount = kept.filter { $0 == "." }.count
        let commaCount = kept.filter { $0 == "," }.count

        let normalized: String
        if dotCount > 0 && commaCount > 0 {
            // Both separators present — whichever is rightmost is the decimal.
            let lastDot = kept.lastIndex(of: ".")!
            let lastComma = kept.lastIndex(of: ",")!
            if lastDot > lastComma {
                // "1,234.56" — comma = thousands, dot = decimal.
                normalized = kept.replacingOccurrences(of: ",", with: "")
            } else {
                // "1.234,56" — dot = thousands, comma = decimal.
                normalized = kept
                    .replacingOccurrences(of: ".", with: "")
                    .replacingOccurrences(of: ",", with: ".")
            }
        } else if commaCount > 0 {
            normalized = normalizeSingleSeparator(kept, separator: ",")
        } else if dotCount > 0 {
            normalized = normalizeSingleSeparator(kept, separator: ".")
        } else {
            normalized = kept
        }

        return Double(normalized)
    }

    /// Decides whether a lone separator is decimal or thousands.
    /// Multiple occurrences → thousands ("1.234.567" → 1234567).
    /// Single occurrence with exactly 3 digits following → thousands ("1,234" → 1234).
    /// Otherwise → decimal ("12,34" → 12.34).
    private static func normalizeSingleSeparator(
        _ text: String, separator: Character
    ) -> String {
        let count = text.filter { $0 == separator }.count
        guard let lastIdx = text.lastIndex(of: separator) else { return text }
        let digitsAfter = text.distance(from: lastIdx, to: text.endIndex) - 1
        let isThousands = count > 1 || digitsAfter == 3

        if isThousands {
            return text.replacingOccurrences(of: String(separator), with: "")
        }
        if separator == "," {
            return text.replacingOccurrences(of: ",", with: ".")
        }
        return text
    }

    // MARK: - Database Path

    static func getDatabasePath() -> String? {
        guard let documentsURL = FileManager.default.urls(
            for: .documentDirectory,
            in: .userDomainMask
        ).first else {
            return nil
        }
        let dbPath = documentsURL.appendingPathComponent("watermelon.db").path
        guard FileManager.default.fileExists(atPath: dbPath) else {
            return nil
        }
        return dbPath
    }

    // MARK: - Read Base Currency

    static func readBaseCurrency() -> String {
        guard let dbPath = getDatabasePath() else { return "USD" }

        var db: OpaquePointer?
        guard sqlite3_open_v2(dbPath, &db, SQLITE_OPEN_READONLY, nil) == SQLITE_OK else {
            return "USD"
        }
        defer { sqlite3_close(db) }

        var stmt: OpaquePointer?
        let query = "SELECT value FROM local_storage WHERE key = 'defaultCurrency'"
        guard sqlite3_prepare_v2(db, query, -1, &stmt, nil) == SQLITE_OK else {
            return "USD"
        }
        defer { sqlite3_finalize(stmt) }

        if sqlite3_step(stmt) == SQLITE_ROW,
           let cString = sqlite3_column_text(stmt, 0) {
            let raw = String(cString: cString)
            let unwrapped = unwrapJSONString(raw)
            return normalizedCurrencyCode(unwrapped) ?? "USD"
        }

        return "USD"
    }

    // MARK: - Insert Transaction

    static func insertTransaction(
        id: String,
        merchant: String,
        amount: Double,
        date: Double,
        currencyCode: String,
        baseCurrencyCode: String,
        amountInBaseCurrency: Double,
        exchangeRate: Double,
        conversionStatus: String
    ) -> Bool {
        guard let dbPath = getDatabasePath() else { return false }

        var db: OpaquePointer?
        guard sqlite3_open_v2(dbPath, &db, SQLITE_OPEN_READWRITE, nil) == SQLITE_OK else {
            return false
        }
        defer { sqlite3_close(db) }

        let sql = """
            INSERT INTO transactions (
                id, merchant, note, amount, created_at, updated_at, date,
                "currencyCode", "categoryId", "baseCurrencyCode",
                "amountInBaseCurrency", "exchangeRate", "conversionStatus",
                "recurringTransactionId", "tripId", _status, _changed
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, NULL, NULL, 'created', '')
            """

        var stmt: OpaquePointer?
        guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else {
            return false
        }
        defer { sqlite3_finalize(stmt) }

        sqlite3_bind_text(stmt, 1, (id as NSString).utf8String, -1, Self.SQLITE_TRANSIENT)
        sqlite3_bind_text(stmt, 2, (merchant as NSString).utf8String, -1, Self.SQLITE_TRANSIENT)
        sqlite3_bind_text(stmt, 3, ("" as NSString).utf8String, -1, Self.SQLITE_TRANSIENT) // note
        sqlite3_bind_double(stmt, 4, amount)
        sqlite3_bind_double(stmt, 5, date) // created_at
        sqlite3_bind_double(stmt, 6, date) // updated_at
        sqlite3_bind_double(stmt, 7, date) // date
        sqlite3_bind_text(stmt, 8, (currencyCode as NSString).utf8String, -1, Self.SQLITE_TRANSIENT)
        sqlite3_bind_text(stmt, 9, (baseCurrencyCode as NSString).utf8String, -1, Self.SQLITE_TRANSIENT)
        sqlite3_bind_double(stmt, 10, amountInBaseCurrency)
        sqlite3_bind_double(stmt, 11, exchangeRate)
        sqlite3_bind_text(stmt, 12, (conversionStatus as NSString).utf8String, -1, Self.SQLITE_TRANSIENT)

        return sqlite3_step(stmt) == SQLITE_DONE
    }

    // MARK: - Currency Conversion

    static func fetchExchangeRate(
        from targetCurrency: String,
        to baseCurrency: String
    ) -> Double? {
        let target = targetCurrency.lowercased()
        let base = baseCurrency.lowercased()

        let urls = [
            "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/\(target).json",
            "https://currency-api.pages.dev/v1/currencies/\(target).json"
        ]

        for urlString in urls {
            guard let url = URL(string: urlString) else { continue }

            let semaphore = DispatchSemaphore(value: 0)
            var resultRate: Double?

            var request = URLRequest(url: url)
            request.timeoutInterval = 5

            let task = URLSession.shared.dataTask(with: request) { data, response, error in
                defer { semaphore.signal() }
                guard error == nil,
                      let httpResponse = response as? HTTPURLResponse,
                      httpResponse.statusCode == 200,
                      let data = data,
                      let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                      let currencyData = json[target] as? [String: Any],
                      let rate = currencyData[base] as? Double,
                      rate > 0, rate.isFinite else {
                    return
                }
                resultRate = rate
            }
            task.resume()
            semaphore.wait()

            if let rate = resultRate {
                return rate
            }
        }

        return nil
    }
}
