#import "AppDelegate.h"

#import <React/RCTBundleURLProvider.h>
#import <React/RCTLinkingManager.h>
#import <ReactAppDependencyProvider/RCTAppDependencyProvider.h>
#import <Expo-Swift.h>

static UIWindow *sBootstrapWindow = nil;
static ExpoReactNativeFactory *sReactNativeFactory = nil;
static ExpoReactNativeFactoryDelegate *sReactNativeFactoryDelegate = nil;

@interface EXAppDelegateWrapper (StroberiReactNativeFactory)
@property (nonatomic, strong, nullable) RCTReactNativeFactory *factory;
@end

@interface ExpoReactNativeFactoryDelegate (StroberiBundleURL)
@end

@implementation ExpoReactNativeFactoryDelegate (StroberiBundleURL)

- (NSURL *)bundleURL
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@".expo/.virtual-metro-entry"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

@end

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  // Expo Dev Launcher expects a key window to exist during app delegate subscription.
  // Ensure one is present before calling super, without relying on `window` selector
  // on the Expo wrapper delegate classes.
  UIWindow *launchWindow = nil;
  for (UIWindow *window in application.windows) {
    if (window.isKeyWindow) {
      launchWindow = window;
      break;
    }
  }

  if (launchWindow == nil) {
    launchWindow = [[UIWindow alloc] initWithFrame:[UIScreen mainScreen].bounds];
    launchWindow.rootViewController = [UIViewController new];
    [launchWindow makeKeyAndVisible];
  }
  sBootstrapWindow = launchWindow;

  self.moduleName = @"main";

  // You can add your custom initial props in the dictionary below.
  // They will be passed down to the ViewController used by React Native.
  self.initialProps = @{};

  // Set up the Expo React Native factory before AppDelegate subscribers run.
  // Dev Client depends on this factory being ready so it can call autoSetupPrepare
  // before the launch subscriber calls autoSetupStart.
  sReactNativeFactoryDelegate = [ExpoReactNativeFactoryDelegate new];
  sReactNativeFactoryDelegate.dependencyProvider = [RCTAppDependencyProvider new];
  sReactNativeFactory = [[ExpoReactNativeFactory alloc] initWithDelegate:sReactNativeFactoryDelegate];
  self.factory = sReactNativeFactory;
  [sReactNativeFactory startReactNativeWithModuleName:self.moduleName
                                              inWindow:sBootstrapWindow
                                     initialProperties:self.initialProps
                                         launchOptions:launchOptions];

  BOOL didFinishLaunching = [super application:application didFinishLaunchingWithOptions:launchOptions];

  return didFinishLaunching;
}

// Linking API
- (BOOL)application:(UIApplication *)application openURL:(NSURL *)url options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options {
  return [super application:application openURL:url options:options] || [RCTLinkingManager application:application openURL:url options:options];
}

// Universal Links
- (BOOL)application:(UIApplication *)application continueUserActivity:(nonnull NSUserActivity *)userActivity restorationHandler:(nonnull void (^)(NSArray<id<UIUserActivityRestoring>> * _Nullable))restorationHandler {
  BOOL result = [RCTLinkingManager application:application continueUserActivity:userActivity restorationHandler:restorationHandler];
  return [super application:application continueUserActivity:userActivity restorationHandler:restorationHandler] || result;
}

// Explicitly define remote notification delegates to ensure compatibility with some third-party libraries
- (void)application:(UIApplication *)application didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken
{
  return [super application:application didRegisterForRemoteNotificationsWithDeviceToken:deviceToken];
}

// Explicitly define remote notification delegates to ensure compatibility with some third-party libraries
- (void)application:(UIApplication *)application didFailToRegisterForRemoteNotificationsWithError:(NSError *)error
{
  return [super application:application didFailToRegisterForRemoteNotificationsWithError:error];
}

// Explicitly define remote notification delegates to ensure compatibility with some third-party libraries
- (void)application:(UIApplication *)application didReceiveRemoteNotification:(NSDictionary *)userInfo fetchCompletionHandler:(void (^)(UIBackgroundFetchResult))completionHandler
{
  return [super application:application didReceiveRemoteNotification:userInfo fetchCompletionHandler:completionHandler];
}

@end
