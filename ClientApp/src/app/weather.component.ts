import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

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