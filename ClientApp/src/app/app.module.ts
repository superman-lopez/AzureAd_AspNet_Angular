import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HomeComponent } from './home/home.component';
import { ProfileComponent } from './profile/profile.component';

import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { MsalService, MSAL_INSTANCE, MsalGuard, MsalInterceptor, MsalBroadcastService } from './msal';
import { IPublicClientApplication, PublicClientApplication } from '@azure/msal-browser';
import { MSAL_GUARD_CONFIG, InteractionType, MSAL_INTERCEPTOR_CONFIG } from './msal/constants';
import { MsalGuardConfiguration } from './msal/msal.guard.config';
import { MsalInterceptorConfig } from './msal/msal.interceptor.config';
import { WeatherComponent } from './weather.component';

function MSALInstanceFactory(): IPublicClientApplication {
  return new PublicClientApplication({
    auth: {
		clientId: '2ce51a62-4d0a-453b-8fe1-7ab0788f526f',
		redirectUri: 'https://localhost:5001/',
    }
  });
}

function MSALInterceptorConfigFactory(): MsalInterceptorConfig {
  const protectedResourceMap = new Map<string, Array<string>>();
  protectedResourceMap.set('https://graph.microsoft.com/v1.0/me', ['user.read']);
  protectedResourceMap.set('/WeatherForecast', ['api://574484f3-54ec-4368-af40-3e4091a44861/access_as_user']);

  return {
    interactionType: InteractionType.REDIRECT,
    protectedResourceMap,
  };
}

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    ProfileComponent,
	WeatherComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    MatButtonModule,
    MatToolbarModule,
    MatListModule,
    HttpClientModule
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: MsalInterceptor,
      multi: true
    },
    {
      provide: MSAL_INSTANCE,
      useFactory: MSALInstanceFactory
    },
    {
      provide: MSAL_GUARD_CONFIG,
      useValue: {
        interactionType: InteractionType.REDIRECT
      } as MsalGuardConfiguration
    },
    {
      provide: MSAL_INTERCEPTOR_CONFIG,
      useFactory: MSALInterceptorConfigFactory
    },
    MsalService,
    MsalGuard,
    MsalBroadcastService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
