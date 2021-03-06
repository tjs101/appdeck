//
//  AppDeckInMobiInterstitialCustomEvent.m
//  AppDeck
//
//  Created by Mathieu De Kermadec on 06/08/2015.
//  Copyright (c) 2015 Mathieu De Kermadec. All rights reserved.
//

#import "IMInterstitial.h"
#import "IMInterstitialDelegate.h"
#import "AppDeckInMobiInterstitialCustomEvent.h"
#import "MPInstanceProvider.h"
#import "MPLogging.h"

static NSString *gAppId = nil;

@interface MPInstanceProvider (InMobiInterstitials)

- (IMInterstitial *)buildIMInterstitialWithDelegate:(id<IMInterstitialDelegate>)delegate appId:(NSString *)appId;

@end

@implementation MPInstanceProvider (InMobiInterstitials)

- (IMInterstitial *)buildIMInterstitialWithDelegate:(id<IMInterstitialDelegate>)delegate appId:(NSString *)appId {
    IMInterstitial *inMobiInterstitial = [[IMInterstitial alloc] initWithAppId:appId];
    inMobiInterstitial.delegate = delegate;
    return inMobiInterstitial;
}

@end

////////////////////////////////////////////////////////////////////////////////////////////////////


@interface AppDeckInMobiInterstitialCustomEvent () <IMInterstitialDelegate>

@property (nonatomic, strong) IMInterstitial *inMobiInterstitial;

@end

@implementation AppDeckInMobiInterstitialCustomEvent

@synthesize inMobiInterstitial = _inMobiInterstitial;

+ (void)setAppId:(NSString *)appId
{
    gAppId = [appId copy];
}

#pragma mark - MPInterstitialCustomEvent Subclass Methods

- (void)requestInterstitialWithCustomEventInfo:(NSDictionary *)info
{
    MPLogInfo(@"Requesting InMobi interstitial");
    
    NSString *appId = gAppId;
    if ([appId length] == 0) {
        appId = [info objectForKey:@"app_id"];
        gAppId = appId;
        [InMobi initialize:appId];
    }
    
    self.inMobiInterstitial = [[MPInstanceProvider sharedProvider] buildIMInterstitialWithDelegate:self appId:appId];
    NSMutableDictionary *paramsDict = [NSMutableDictionary dictionary];
    [paramsDict setObject:@"c_mopub" forKey:@"tp"];
    [paramsDict setObject:MP_SDK_VERSION forKey:@"tp-ver"];
    self.inMobiInterstitial.additionaParameters = paramsDict; // For supply source identification
    if (self.delegate.location) {
        [InMobi setLocationWithLatitude:self.delegate.location.coordinate.latitude
                              longitude:self.delegate.location.coordinate.longitude
                               accuracy:self.delegate.location.horizontalAccuracy];
    }
    [self.inMobiInterstitial loadInterstitial];
}

- (void)showInterstitialFromRootViewController:(UIViewController *)rootViewController
{
    [self.inMobiInterstitial presentInterstitialAnimated:YES];
}

- (void)dealloc
{
    [self.inMobiInterstitial setDelegate:nil];
}

#pragma mark - IMAdInterstitialDelegate


- (void)interstitialDidReceiveAd:(IMInterstitial *)ad {
    MPLogInfo(@"InMobi interstitial did load");
    [self.delegate interstitialCustomEvent:self didLoadAd:ad];
}

- (void)interstitial:(IMInterstitial *)ad didFailToReceiveAdWithError:(IMError *)error {
    
    MPLogInfo(@"InMobi banner did fail with error: %@", error.localizedDescription);
    [self.delegate interstitialCustomEvent:self didFailToLoadAdWithError:nil];
}

- (void)interstitialWillPresentScreen:(IMInterstitial *)ad {
    MPLogInfo(@"InMobi interstitial will present");
    [self.delegate interstitialCustomEventWillAppear:self];
    
    // InMobi doesn't seem to have a separate callback for the "did appear" event, so we
    // signal that manually.
    [self.delegate interstitialCustomEventDidAppear:self];
}

- (void)interstitial:(IMInterstitial *)ad didFailToPresentScreenWithError:(IMError *)error {
    MPLogInfo(@"InMobi interstitial failed to present with error: %@", error.localizedDescription);
    [self.delegate interstitialCustomEvent:self didFailToLoadAdWithError:nil];
}

- (void)interstitialWillDismissScreen:(IMInterstitial *)ad {
    MPLogInfo(@"InMobi interstitial will dismiss");
    [self.delegate interstitialCustomEventWillDisappear:self];
}

- (void)interstitialDidDismissScreen:(IMInterstitial *)ad {
    MPLogInfo(@"InMobi interstitial did dismiss");
    [self.delegate interstitialCustomEventDidDisappear:self];
}

- (void)interstitialWillLeaveApplication:(IMInterstitial *)ad {
    MPLogInfo(@"InMobi interstitial will leave application");
    [self.delegate interstitialCustomEventWillLeaveApplication:self];
}

- (void) interstitialDidInteract:(IMInterstitial *)ad withParams:(NSDictionary *)dictionary {
    MPLogInfo(@"InMobi interstitial was tapped");
    [self.delegate interstitialCustomEventDidReceiveTapEvent:self];
}

@end
