import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { ProfileComponent } from './profile/profile.component';
import { HomeComponent } from './home/home.component';
import { MsalGuard } from './msal';
import { WeatherComponent } from './weather.component';

const routes: Routes = [
  	{
		path: 'profile',
		component: ProfileComponent,
		canActivate: [
		MsalGuard
		]
	},
	{
		path: 'weather',
		component: WeatherComponent
	},
	{
		path: '',
		component: HomeComponent
	}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
