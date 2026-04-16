#import "IntentSQLiteBridge.h"

// Forward declarations of the sqlite3 C API we use.
// Including <sqlite3.h> triggers Clang to auto-import either the system
// SQLite3 module or the vendored ExpoSQLite module, which have incompatible
// definitions of fts5_api and collide at build time. libsqlite3 is already
// linked into the app by other pods, so prototypes are all we need.

typedef struct sqlite3 sqlite3;
typedef struct sqlite3_stmt sqlite3_stmt;
typedef void (*sqlite3_destructor_t)(void *);

#define SQLITE_OK              0
#define SQLITE_ROW           100
#define SQLITE_DONE          101
#define SQLITE_OPEN_READONLY   0x00000001
#define SQLITE_OPEN_READWRITE  0x00000002

extern int sqlite3_open_v2(const char *filename, sqlite3 **ppDb, int flags, const char *zVfs);
extern int sqlite3_close(sqlite3 *db);
extern int sqlite3_prepare_v2(sqlite3 *db, const char *zSql, int nByte,
                              sqlite3_stmt **ppStmt, const char **pzTail);
extern int sqlite3_step(sqlite3_stmt *pStmt);
extern int sqlite3_finalize(sqlite3_stmt *pStmt);
extern int sqlite3_bind_text(sqlite3_stmt *pStmt, int idx, const char *value,
                             int n, sqlite3_destructor_t destructor);
extern int sqlite3_bind_double(sqlite3_stmt *pStmt, int idx, double value);
extern const unsigned char *sqlite3_column_text(sqlite3_stmt *pStmt, int iCol);

static const sqlite3_destructor_t kSQLiteTransient = (sqlite3_destructor_t)-1;

@implementation IntentSQLiteBridge

+ (nullable NSString *)readStringForKey:(NSString *)key
                               fromPath:(NSString *)dbPath {
    sqlite3 *db = NULL;
    if (sqlite3_open_v2(dbPath.UTF8String, &db, SQLITE_OPEN_READONLY, NULL) != SQLITE_OK) {
        if (db) sqlite3_close(db);
        return nil;
    }

    sqlite3_stmt *stmt = NULL;
    const char *sql = "SELECT value FROM local_storage WHERE key = ?";
    if (sqlite3_prepare_v2(db, sql, -1, &stmt, NULL) != SQLITE_OK) {
        sqlite3_close(db);
        return nil;
    }
    sqlite3_bind_text(stmt, 1, key.UTF8String, -1, kSQLiteTransient);

    NSString *result = nil;
    if (sqlite3_step(stmt) == SQLITE_ROW) {
        const unsigned char *cstr = sqlite3_column_text(stmt, 0);
        if (cstr) {
            result = [NSString stringWithUTF8String:(const char *)cstr];
        }
    }
    sqlite3_finalize(stmt);
    sqlite3_close(db);
    return result;
}

+ (BOOL)insertTransactionIntoPath:(NSString *)dbPath
                       identifier:(NSString *)identifier
                         merchant:(NSString *)merchant
                           amount:(double)amount
                             date:(double)date
                     currencyCode:(NSString *)currencyCode
                 baseCurrencyCode:(NSString *)baseCurrencyCode
             amountInBaseCurrency:(double)amountInBaseCurrency
                     exchangeRate:(double)exchangeRate
                 conversionStatus:(NSString *)conversionStatus {
    sqlite3 *db = NULL;
    if (sqlite3_open_v2(dbPath.UTF8String, &db, SQLITE_OPEN_READWRITE, NULL) != SQLITE_OK) {
        if (db) sqlite3_close(db);
        return NO;
    }

    const char *sql =
        "INSERT INTO transactions ("
        "id, merchant, note, amount, created_at, updated_at, date, "
        "\"currencyCode\", \"categoryId\", \"baseCurrencyCode\", "
        "\"amountInBaseCurrency\", \"exchangeRate\", \"conversionStatus\", "
        "\"recurringTransactionId\", \"tripId\", _status, _changed"
        ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, NULL, NULL, 'created', '')";

    sqlite3_stmt *stmt = NULL;
    if (sqlite3_prepare_v2(db, sql, -1, &stmt, NULL) != SQLITE_OK) {
        sqlite3_close(db);
        return NO;
    }

    sqlite3_bind_text(stmt, 1, identifier.UTF8String, -1, kSQLiteTransient);
    sqlite3_bind_text(stmt, 2, merchant.UTF8String, -1, kSQLiteTransient);
    sqlite3_bind_text(stmt, 3, "", -1, kSQLiteTransient);
    sqlite3_bind_double(stmt, 4, amount);
    sqlite3_bind_double(stmt, 5, date);
    sqlite3_bind_double(stmt, 6, date);
    sqlite3_bind_double(stmt, 7, date);
    sqlite3_bind_text(stmt, 8, currencyCode.UTF8String, -1, kSQLiteTransient);
    sqlite3_bind_text(stmt, 9, baseCurrencyCode.UTF8String, -1, kSQLiteTransient);
    sqlite3_bind_double(stmt, 10, amountInBaseCurrency);
    sqlite3_bind_double(stmt, 11, exchangeRate);
    sqlite3_bind_text(stmt, 12, conversionStatus.UTF8String, -1, kSQLiteTransient);

    BOOL ok = sqlite3_step(stmt) == SQLITE_DONE;
    sqlite3_finalize(stmt);
    sqlite3_close(db);
    return ok;
}

@end
