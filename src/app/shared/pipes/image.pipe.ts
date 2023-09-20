import {Pipe, PipeTransform} from '@angular/core';
import {LocalStorageService} from "angular-2-local-storage";
import {Observable} from 'rxjs';
import {switchMap} from 'rxjs/operators';
import {HttpClient, HttpHeaders} from '@angular/common/http';

@Pipe({name: 'image'})
export class ImagePipe implements PipeTransform {
  private readonly BEARER_TOKEN: string = "bearer_token";

  constructor(private http: HttpClient, private localStorage: LocalStorageService) {
  }

  transform(url: string) {
    let headers = new HttpHeaders();
    headers = headers.append('Content-Type', 'image/*');
    headers = headers.append('Authorization', 'Bearer ' + this.localStorage.get<string>(this.BEARER_TOKEN));
    let promise = this.http.request('GET', url, {headers: headers, responseType: 'blob'})
      .pipe(switchMap(blob => {
        return Observable.create(observer => {
          const reader = new FileReader();
          reader.readAsDataURL(blob); // convert blob to base64
          reader.onloadend = function () {
            observer.next(reader.result); // emit the base64 string result
          }
        });
      }));
    return promise;
  }
}
