#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(ShortcutsModule, NSObject)

RCT_EXTERN_METHOD(testLogTransaction:
                  (RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
