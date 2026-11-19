import { defineStore } from 'pinia';
import request from '../utils/request';

export interface HospitalItem {
  id: number;
  hospitalName: string;
  hospitalCode: string;
  contactPerson?: string;
  contactPhone?: string;
  address?: string;
  status?: number;
}

export const useTenantStore = defineStore('tenant', {
  state: () => ({
    currentHospitalId: Number(localStorage.getItem('active_hospital_id')) || 0,
    hospitalList: [] as HospitalItem[]
  }),
  actions: {
    async fetchHospitalList() {
      try {
        const list = (await request.get('/admin/hospitals')) as any;
        this.hospitalList = list;
      } catch (e) {
        console.error(e);
      }
    },
    setHospitalId(id: number) {
      this.currentHospitalId = id;
      localStorage.setItem('active_hospital_id', String(id));
      // 切换租户后刷新页面，让各业务页面以新租户上下文重新拉取数据
      window.location.reload();
    }
  }
});
