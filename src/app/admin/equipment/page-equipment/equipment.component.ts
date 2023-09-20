import {Component, OnInit} from '@angular/core';
import {NgbModal} from '@ng-bootstrap/ng-bootstrap';
import {CreateEquipmentComponent} from 'app/admin/equipment/create-equipment/create-equipment.component';
import {Subject} from 'rxjs';

@Component({
  selector: 'app-equipment',
  templateUrl: './equipment.component.html',
  styleUrls: ['./equipment.component.less']
})
export class EquipmentComponent implements OnInit {

  private newEquipmentSubject: Subject<void> = new Subject<void>();

  constructor(private modalService: NgbModal) {
  }

  ngOnInit() {
  }

  onCreate() {
    const modalRef = this.modalService.open(CreateEquipmentComponent, {
      windowClass: 'add-equip-modal',
      backdrop: 'static'
    });
    modalRef.componentInstance.isNew = true;

    modalRef.result.then((result) => {
      this.newEquipmentSubject.next();
    }, (reason) => {
    });
  }

}
