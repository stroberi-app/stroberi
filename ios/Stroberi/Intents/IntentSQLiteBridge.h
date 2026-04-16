#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface IntentSQLiteBridge : NSObject

+ (nullable NSString *)readStringForKey:(NSString *)key
                               fromPath:(NSString *)dbPath;

+ (BOOL)insertTransactionIntoPath:(NSString *)dbPath
                       identifier:(NSString *)identifier
                         merchant:(NSString *)merchant
                           amount:(double)amount
                             date:(double)date
                     currencyCode:(NSString *)currencyCode
                 baseCurrencyCode:(NSString *)baseCurrencyCode
             amountInBaseCurrency:(double)amountInBaseCurrency
                     exchangeRate:(double)exchangeRate
                 conversionStatus:(NSString *)conversionStatus;

@end

NS_ASSUME_NONNULL_END
