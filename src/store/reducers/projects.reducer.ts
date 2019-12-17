import { ProjectActionTypes, CREATE_PROJECT, INIT_ACTIVE_PROJECTS } from '../types/projects.types';
import { Project } from '../../models/project';

export interface ProjectsState {
    projects: Project[];
}

const initialState: ProjectsState = {
    projects: []
}

export function projectsReducer(state = initialState, action: ProjectActionTypes): ProjectsState {
    switch (action.type) {
        case CREATE_PROJECT:
            return {
                projects: [...state.projects, action.payload]
            };
        case INIT_ACTIVE_PROJECTS:
            return {
                projects: action.payload ? action.payload : []
            };
        default:
            return state;
    }
}