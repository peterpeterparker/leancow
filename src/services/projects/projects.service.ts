import { get, set } from 'idb-keyval';

import uuid from 'uuid/v4';

import isAfter from 'date-fns/isAfter';

import { Project, ProjectData } from '../../models/project';

import { toDateObj } from '../../utils/utils';

export class ProjectsService {

    private static instance: ProjectsService;

    private constructor() {
        // Private constructor, singleton
    }

    static getInstance() {
        if (!ProjectsService.instance) {
            ProjectsService.instance = new ProjectsService();
        }
        return ProjectsService.instance;
    }

    create(clientId: string, data: ProjectData): Promise<Project> {
        return new Promise<Project>(async (resolve, reject) => {
            try {
                let projects: Project[] = await get('projects');
    
                if (!projects || projects.length <= 0) {
                    projects = [];
                }
            
                data.client_id = clientId;

                data.create_at = new Date().getTime();
                data.updated_at = new Date().getTime();

                const project: Project = {
                    id: uuid(),
                    data: data
                }

                projects.push(project);
            
                set('projects', projects);

                resolve(project);
            } catch (err) {
                reject(err);
            }
        });
    }
    
    list(filterActive: boolean = true): Promise<Project[]> {
        return new Promise<Project[]>(async (resolve, reject) => {
            try {
                const projects: Project[] = await get('projects');

                if (!projects || projects.length <= 0) {
                    resolve([]);
                    return;
                }

                if (!filterActive) {
                    resolve(projects);
                    return;
                }

                const filteredProjects: Project[] = projects.filter((project: Project) => {
                    const from: Date | undefined = toDateObj(project.data.from);
                    const to: Date | undefined = toDateObj(project.data.to);

                    if (!to || to === undefined) {
                        return true;
                    }

                    return isAfter(to, from ? from : new Date());
                });

                resolve(filteredProjects && filteredProjects.length > 0 ? filteredProjects : []);
            } catch (err) {
                reject(err);
            }
        });
    }
}