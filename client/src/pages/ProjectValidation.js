import React, { Component } from 'react';
import ProjectsListCard from '../components/Projects/ProjectsListCard';
import withAuth from '../components/withAuth';


class ProjectValidation extends Component {
    render() {
        return (
            <div>
                <ProjectsListCard admin/>
            </div>
        )
    }
}

//export default withAuth(ProjectValidation);
export default ProjectValidation;