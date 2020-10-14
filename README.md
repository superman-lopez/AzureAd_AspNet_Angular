# Azure AD with authentication code flow, and Angular SPA + ASP.net Web API
## Objective
This project aims to implement the following:
- Protected ASP.net Web Api
- Angular client application that authenticates the user so to access the protected Web API
- Authentication through Azure AD using Authentication Code Flow (Authorization Code Grant with PKCE)
- Multitenant Azure AD authentication

It uses the following MSAL libraries:
- `Microsoft.Identity.Web` for the ASP.net application
- `msal-browser` for the Angular client application

## 1. ASP.net WebAPI
Following this instruction: https://github.com/Azure-Samples/active-directory-dotnet-native-aspnetcore-v2/tree/master/1.%20Desktop%20app%20calls%20Web%20API the Web API is prepared for Authentication

The ASP.net Web api was scaffolded using `dotnet new webapi -au=SingleOrg`
In Startup.cs replace:
```
.AddAzureAdBearer(options => Configuration.Bind("AzureAd", options));
```
With:
```
services.AddMicrosoftIdentityWebApiAuthentication(Configuration);
```

For now, disable the `[Authorize]` attribute in the controller, file `WeatherForecastController.cs` so that the connectivity can be tested without authentication:
```c
[ApiController]
// [Authorize]
[Route("[controller]")]
public class WeatherForecastController : ControllerBase
{
	...
}
```

### Register Web API on Azure AD
Detailed steps can be found in the previously linked [instructions](https://github.com/Azure-Samples/active-directory-dotnet-native-aspnetcore-v2/tree/master/1.%20Desktop%20app%20calls%20Web%20API), below is a summmary.
- Create a new Application Registration, without specifying the redirectUri.  
- After creating a new registration choose to "Expose an API".  
- Add a new scope, after which the portal will first prompt for an Application ID URI.  
- Save and continue to create the scope, in this project scope is named `access_as_user`.  
- Make sure the Admin and Users can provide consent by selecting the correct value of the switch button.  

The registration details need to be specified in the appsettings.json file for AzureAd.
In `appsettings.json`:
```js
"AzureAd": {
	"Instance": "https://login.microsoftonline.com/",
	"Domain": "domain.com",
	"TenantId": "$insert_tenant_id_here",
	"ClientId": "574484f3-54ec-4368-af40-3e4091a44861"
},
```
Make sure the `$insert_tenant_id_here` has the correct value: either `common` or `organizations`.  The `ClientId` is the application registration id.

## 2. Angular SPA client
Angular client is brought in from the Angular msal-browser example, which includes an integration of `@azure/msal-browser`: https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/samples/msal-angular-v2-samples/angular10-browser-sample .
The `msal-browser` library will facilitate the authentication and also has a class for the Angular HttpInterceptor allowing the authenticated cookie from the SPA to be included in the HTTP request to the Web API.
Pull the repository and copy the content of the `angular10-browser-sample` folder into a new folder called `ClientApp`.

To facilitate serving `ClientApp` it is possible to install `Microsoft.AspNetCore.SpaServices.Extensions` library in the Web API.  The middleware is then added in `Startup.cs`:
```c
app.UseSpa(spa =>
{
	spa.Options.SourcePath = "ClientApp";

	if (env.IsDevelopment())
	{
		spa.UseProxyToSpaDevelopmentServer("http://localhost:4200");
	}
});
```
After this, when running or debugging the Web API application, the Angular can be served by running the application from the ClientApp location.  
```
npm start
```
Then the integration of the Angular and ASP.net http server can be tested at http://localhost:5000/ and https://localhost:5001/ (check for debug console errors in case the SSL certificate needs to be trusted).

### Register Angular SPA on Azure AD
Following these instructions: https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-v2-javascript-auth-code :
- Select New registration and name the registration.  
- After registration, under Platform configurations, select Add a platform. In the pane that opens select Single-page application.
- Set the Redirect URI value to `https://localhost:5001/` (Note `https` protocol and the port number of the redirect).

Next add the API permission, which is the Web API Application Registration that was instructed above.  
- Select "API permission", and then "Add a permission".  
- Under "My APIs" the previously registered API should show.  
- Click the application, then select and add the permission `access-as-user`.  

Next configure the library `msal-browser` in the `app.module.ts` to match the Application Registration, make sure to use the Client ID from the Application Registration related to the Single-page application (and not the Web API client id).

```js
function MSALInstanceFactory(): IPublicClientApplication {
	return new PublicClientApplication({
		auth: {
			clientId: '2ce51a62-4d0a-453b-8fe1-7ab0788f526f',
			redirectUri: 'https://localhost:5001/',
		}
	  });
}
```

Choose between popup or redirect in both configuration locations within `app.module.ts`:
```js
interactionType: InteractionType.REDIRECT
```

## 3. Web API call
Create a new empty Angular component for the Web API call, the sample component is called `WeatherComponent`.
```js
@Component({
	template: `
	<ng-container *ngFor="let weatherReport of weatherReports">
		<pre>
			{{ weatherReport | json }}	
		</pre>
	</ng-container>
	`
})

export class WeatherComponent implements OnInit {
	constructor(private httpClient: HttpClient) { }

	public weatherReports: Array<any> = [];
	
	ngOnInit(): void {
		this.httpClient.get<Array<any>>('/WeatherForecast').subscribe(data => this.weatherReports = data);
	}
}
```

In `app.module.ts`, add the new component:
```js
declarations: [
	...
	WeatherComponent
],
```
Add create a new route in `app-routing.module.ts`:
```js
const routes: Routes = [
	...
	{
		path: 'weather',
		component: WeatherComponent
	}
];
```
Note that unlike the `profile` route, this route can not activate `MsalGuard`.  This is just a simplification to remove a variable in the setup.

Add a link to the `WeatherComponent`.  In `app.component.html`:
```html
  	<a mat-button *ngIf="loggedIn" [routerLink]="['weather']">Weather API</a>
```

At this point the Web API is not yet protected, but it's possible to try authenticate within the SPA client using the Azure AD account.  Pressing the Login button should redirect to the Azure AD login and consent forms.  Clicking the Profile button will trigger a call to Microsoft Graph, and the Angular SPA HTTP call will be intercepted, and the correct scope `user.read` is added in the request (see `msal.interceptor.ts`).

Now when loading the Angular Weather API component while authenticated, the Angular SPA client should be able to show the Web API data.

### Protect Web API
After this the Web API can be protected: uncomment the `[Authorize]` attribute.  Calling the Web API from the client app should now shows an `401 (Unauthorized)` in your console.  This is because the required scope is not added in the HTTP call.

In `app.module.ts` will add a Map for our API with the correct scope:
```js
function MSALInterceptorConfigFactory(): MsalInterceptorConfig {
...
  protectedResourceMap.set('/WeatherForecast', ['api://574484f3-54ec-4368-af40-3e4091a44861/access_as_user']);
...
}
```

Note that the scope here needs to be the api key created on the Azure platform, in paragraph 1.
Now the Web API call from the SPA should be authenticated by the Web API.

##  4. Make API accessible to other tennants
With the current configuration, users from outside tennants are not able to be authenticated on the Web API.  It's necessary to add our Angular SPA Application Registration as an authorized client application:
1. Open the Application registration for the Web API (the one created in step 1)
2. Under "Expose an API" add a client application
3. Use the client id from the Angular SPA, so the registration from step 2, and select the API scope

Now other tenants should be able to authenticate in the Angular SPA as well as call the Web API through the SPA.
