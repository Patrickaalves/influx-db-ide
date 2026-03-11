import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ConfigService } from '../../services/config.service';
import { InfluxConfig } from '../../models/influx.models';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
  isConnected = false;
  currentConfig: InfluxConfig | null = null;

  constructor(private configService: ConfigService) {
    this.configService.config$.subscribe(config => {
      this.currentConfig = config;
      this.isConnected = config !== null && config.url !== '';
    });
  }
}
