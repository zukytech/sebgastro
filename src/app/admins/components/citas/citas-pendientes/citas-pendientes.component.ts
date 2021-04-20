import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import {
  AfterViewInit,
  Component,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { Cita } from 'src/app/core/interfaces/cita.module';
import { MessageRequest } from 'src/app/core/interfaces/messageRequest.module';
import { UserLogged } from 'src/app/core/interfaces/userLogged.module';
import { HttpRequestService } from 'src/app/core/services/http-request.service';
import { UserloginService } from 'src/app/core/services/userlogin.service';
import { CitasViewDialogComponent } from 'src/app/shared/components/dialogs/citas/citas-view-dialog/citas-view-dialog.component';
import { environment } from 'src/environments/environment';
import { OpcionesCitaDialogComponent } from '../../dialogs/opciones-cita-dialog/opciones-cita-dialog.component';

@Component({
  selector: 'app-citas-pendientes',
  templateUrl: './citas-pendientes.component.html',
  styles: []
})
export class CitasPendientesComponent
  implements OnInit, AfterViewInit, OnDestroy {
  isHandset$: Observable<boolean> = this.breakpointObserver
    .observe(Breakpoints.Handset)
    .pipe(
      map(result => result.matches),
      shareReplay()
    );
  isHandsetValue: boolean;
  private userLogged$: UserLogged;
  private listadoCitas: Cita[] = [];
  private subscriptions = [];

  displayedColumns: string[] = [
    'fecha',
    'hora',
    'tipo',
    'paciente',
    'doctor',
    'estado',
    'opciones'
  ];
  dataSource = new MatTableDataSource();

  constructor(
    private dialog: MatDialog,
    private breakpointObserver: BreakpointObserver,
    private userLogged: UserloginService,
    private httpRequest: HttpRequestService
  ) {}

  @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }

  ngOnInit() {
    this.init();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  // =====================================

  async init() {
    await this.asignarHandsetValue();
    await this.verifyUserLogged();
    this.mostrarCitas();
  }

  private asignarHandsetValue() {
    return new Promise(resolve => {
      const subscription = this.isHandset$.subscribe(value => {
        this.isHandsetValue = value;
        resolve(true);
      });
      this.subscriptions.push(subscription);
    });
  }

  private verifyUserLogged() {
    return new Promise(resolve => {
      this.userLogged.verifyUserLogged().then(result => {
        if (result) {
          const subc = this.userLogged.userLoggedObs$.subscribe(userInfo => {
            this.userLogged$ = userInfo;
            resolve(true);
          });
          this.subscriptions.push(subc);
        }
      });
    });
  }

  private mostrarCitas() {
    const data = new FormData();

    const url = environment.apiUrl + '/admins/citas/mostrarCitas/';
    this.httpRequest
      .postRequest(url, data)
      .pipe(
        map(response => {
          if (response.status === 'success') {
            return response.message as Cita[];
          } else {
            console.log('Problema al mostrar citas');
            return [];
          }
        })
      )
      .subscribe(response => {
        this.listadoCitas = response;
        this.dataSource.data = this.listadoCitas;
      });
  }

  // =====================================

  public showCita(id: any) {
    const citaToShow = this.listadoCitas.find(
      eachCita => eachCita.cita_id === id
    );

    this.dialog.open(CitasViewDialogComponent, {
      width: '90%',
      data: { cita: citaToShow }
    });
  }

  public showCitaOptions(id: any) {
    const cita_estado_id = this.listadoCitas.find(cita => cita.cita_id === id)
      .cita_estado_id;

    const citasOptions = this.dialog.open(OpcionesCitaDialogComponent, {
      width: this.isHandsetValue ? '90%' : '500px',
      data: { cita_id: `${id}`, cita_estado_id: `${cita_estado_id}` }
    });

    citasOptions.afterClosed().subscribe(res => {
      if (res) {
        let url = '';
        const data = new FormData();

        data.append('cita_id', id);

        switch (res.option) {
          case 'anular':
            url = environment.apiUrl + '/Admins/Citas/anularCita/';
            break;

          case 'aprobar':
            url = environment.apiUrl + '/Admins/Citas/aprobarCita/';
            break;

          default:
            break;
        }

        this.httpRequest
          .postRequest(url, data)
          .pipe(map(result => result as MessageRequest))
          .subscribe(response => {
            if (response.status === 'success') {
              this.mostrarCitas();
            } else {
              console.log(`${response.status}: ${response.message}`);
            }
          });
      }
    });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }}
