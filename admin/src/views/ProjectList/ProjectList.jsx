import React from "react";
import { Link } from 'react-router-dom';
import queryString from 'query-string';

// @material-ui/core components
import withStyles from "@material-ui/core/styles/withStyles";
import Checkbox from '@material-ui/core/Checkbox';
import Chip from '@material-ui/core/Chip';
import { FormControlLabel } from "@material-ui/core";

import Visibility from "@material-ui/icons/Visibility"

// core components
import GridItem from "components/Grid/GridItem.jsx";
import GridContainer from "components/Grid/GridContainer.jsx";
import Table from "components/Table/Table.jsx";
import Card from "components/Card/Card.jsx";
import CardHeader from "components/Card/CardHeader.jsx";
import CardBody from "components/Card/CardBody.jsx";
import Button from "components/CustomButtons/Button.jsx";

import AuthService from "../../components/AuthService";
import { withUser } from "../../providers/UserProvider/UserProvider"
import { withSnackbar } from "../../providers/SnackbarProvider/SnackbarProvider";
import { hasPermission } from "components/PermissionHandler";
import { handleXhrError } from "../../components/ErrorHandler";

import { ProjectList as Permissions } from "../../permissions"
import { api } from "config.json"


const styles = {
    cardCategoryWhite: {
        "&,& a,& a:hover,& a:focus": {
            color: "rgba(255,255,255,.62)",
            margin: "0",
            fontSize: "14px",
            marginTop: "0",
            marginBottom: "0"
        },
        "& a,& a:hover,& a:focus": {
            color: "#FFFFFF"
        }
    },
    cardTitleWhite: {
        color: "#FFFFFF",
        marginTop: "0px",
        minHeight: "auto",
        fontWeight: "300",
        fontFamily: "'Roboto', 'Helvetica', 'Arial', sans-serif",
        marginBottom: "3px",
        textDecoration: "none",
        "& small": {
            color: "#777",
            fontSize: "65%",
            fontWeight: "400",
            lineHeight: "1"
        }
    }
};

const FILTERS = {
    validatedProjects: 1,
    rejectedProjects: 2,
    pendingProjects: 3,
    mySpecialization: 4,
    notWaitingForMe: 5
}

class ProjectList extends React.Component {
    constructor(props) {
        super(props);

        /**
         * Filter 1 : Show validated projects
         * Filter 2 : Show rejected projects
         * Filter 3 : Show pending projects
         * Filter 4 : Show only project concerned by my specialization
         * Filter 5 : Show only project waiting for me
         */
        let filters = queryString.parse(props.location.search, { arrayFormat: 'comma' }).filters;

        // Set default filters if none are provided
        if (!filters)
            filters = [FILTERS.pendingProjects, FILTERS.mySpecialization, FILTERS.notWaitingForMe]
        // check if filter is enabled in url parameters.
        let isFilterEnabled = filterNumber => filters.indexOf(filterNumber) !== -1

        this.state = {
            loading: true,
            projects: [],
            filters: [],
            confidentialMapping: [],
            validatedProjects: isFilterEnabled(FILTERS.validatedProjects),
            rejectedProjects: isFilterEnabled(FILTERS.rejectedProjects),
            pendingProjects: isFilterEnabled(FILTERS.pendingProjects),
            mySpecialization: isFilterEnabled(FILTERS.mySpecialization),
            notWaitingForMe: isFilterEnabled(FILTERS.notWaitingForMe),
            canDownloadPdf: false,
            canDownloadCsv: false,
            canDownloadZip: false
        };

        this.handleChange = this.handleChange.bind(this);
    }

    componentWillMount() {
        this.loadProjects();
        this.updateFilters();
    }

    componentWillReceiveProps(nextProps) {
        let canDownloadPdf = hasPermission(Permissions.DownloadPdf, nextProps.user.user);
        let canDownloadCsv = hasPermission(Permissions.DownloadCsv, nextProps.user.user);
        let canDownloadZip = hasPermission(Permissions.DownloadZip, nextProps.user.user);

        this.setState({ canDownloadPdf, canDownloadCsv, canDownloadZip });
    }

    loadProjects() {
        AuthService.fetch(api.host + ":" + api.port + "/api/project/all")
            .then(res => {
                if (res.ok)
                    return res.json();
                else throw res;
            })
            .then(data => {
                this.setState({
                    projects: data,
                    loading: false
                });
            })
            .catch(handleXhrError(this.props.snackbar));
    }

    handleChange = name => event => {
        this.setState(
            { [name]: event.target.checked },
            this.updateFilters
        );
    }

    updateFilters = () => {
        // List of filters that should be applied to project list
        let filters = [];

        // Filter projects depending of their status
        let status = [];

        let filtersId = [];

        if (this.state.rejectedProjects) {
            status.push("rejected");
            filtersId.push(FILTERS.rejectedProjects);
        }
        if (this.state.validatedProjects) {
            status.push("validated");
            filtersId.push(FILTERS.validatedProjects);
        }
        if (this.state.pendingProjects) {
            status.push("pending");
            filtersId.push(FILTERS.pendingProjects);
        }

        filters.push(p => status.indexOf(p.status) !== -1);

        // Filter project that have the same specialization as the current user
        if (this.state.mySpecialization) {
            filters.push(
                project => project.specializations
                    .map(spe => spe.specialization.referent)
                    .flat()
                    .indexOf(this.props.user.user._id) !== -1
            );
            filtersId.push(FILTERS.mySpecialization);
        }

        // Filter projects that are not waiting for any input for the current user
        if (this.state.notWaitingForMe) {
            filters.push(
                p => p.specializations
                    .every(
                        spe => spe.specialization.referent.indexOf(this.props.user.user._id) === -1 ? true : (spe.status === "pending" ? true : false)
                    )
            );
            filtersId.push(FILTERS.notWaitingForMe);
        }

        this.props.history.push("project?filters=" + filtersId.sort().join(','))
        this.setState({ filters })
    }

    render() {
        const { classes } = this.props;
        let loadedContent;

        if (!this.state.loading) {
            const validatedChip = <Chip
                label="Validé"
                style={{ backgroundColor: "#4caf50", color: "white" }}
            />;

            const refusedChip = <Chip
                label="Refusé"
                style={{ backgroundColor: "rgb(244, 67, 54)", color: "white" }}
            />;

            const pendingChip = <Chip
                label="En attente de validation"
                style={{ backgroundColor: "rgb(255, 152, 0)", color: "white" }}
            />;

            let projectsData = applyFilters(this.state.filters, this.state.projects).map(project => {
                if (project.confidential && !hasPermission(Permissions.SeeConfidential, this.props.user.user, project.specializations.map(spe => spe.specialization)))
                    return undefined;
                return [
                    project.number,
                    project.title,
                    project.partner.company,
                    <div>{project.status === "validated" ? validatedChip : (project.status === "pending" ? pendingChip : refusedChip)}</div>,
                    new Date(project.submissionDate).toLocaleDateString(),
                    project.study_year.map(year => year.abbreviation).sort().join(', '),
                    project.specializations
                        .map(spe => spe.specialization.abbreviation + (spe.status === "pending" ? " (En attente)" : (spe.status === "validated" ? " (Validé)" : "(Refusé)")))
                        .sort()
                        .join(', '),
                    (<Link to={"/project/" + project._id}><Button size="sm" type="button" color="info"><Visibility /> Voir le projet</Button></Link>)
                ];
            }).filter(p => p !== undefined);

            let confidentialMapping = applyFilters(this.state.filters, this.state.projects).map(project =>
                (project.confidential && !hasPermission(Permissions.SeeConfidential, this.props.user.user, project.specializations.map(spe => spe.specialization))) ? undefined : project.confidential
            ).filter(p => p !== undefined);

            loadedContent = (
                <Table
                    tableHeaderColor="primary"
                    tableHead={["Numéro", "Nom du projet", "Entreprise", "Statut", "Date de soumission", "Année", "Majeure", "Actions"]}
                    tableData={projectsData}
                    confidential={confidentialMapping}
                />
            );
        }

        return (<GridContainer>
            <GridItem xs={12} sm={12} md={12}>
                <Card>
                    <CardHeader color="primary">
                        <h4 className={classes.cardTitleWhite}>Liste des projets</h4>
                        <p className={classes.cardCategoryWhite}>
                            Liste de tous les projets existants sur la plateforme
                            </p>
                    </CardHeader>
                    <CardBody>
                        <GridContainer>
                            <GridItem xs={12} sm={12} md={6}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={this.state.validatedProjects}
                                            onChange={this.handleChange('validatedProjects')}
                                            value="validatedProjects"
                                            color="primary"
                                        />
                                    }
                                    label="Afficher les projets validés"
                                />
                            </GridItem>

                            <GridItem xs={12} sm={12} md={6}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={this.state.rejectedProjects}
                                            onChange={this.handleChange('rejectedProjects')}
                                            value="rejectedProjects"
                                            color="primary"
                                        />
                                    }
                                    label="Afficher les projets rejetés"
                                />
                            </GridItem>

                            <GridItem xs={12} sm={12} md={6}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={this.state.pendingProjects}
                                            onChange={this.handleChange('pendingProjects')}
                                            value="pendingProjects"
                                            color="primary"
                                        />
                                    }
                                    label="Afficher les projets en attente de validation"
                                />
                            </GridItem>

                            <GridItem xs={12} sm={12} md={6}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={this.state.mySpecialization}
                                            onChange={this.handleChange('mySpecialization')}
                                            value="mySpecialization"
                                            color="primary"
                                        />
                                    }
                                    label="Afficher uniquement les projets de ma majeure"
                                />
                            </GridItem>

                            <GridItem xs={12} sm={12} md={6}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={this.state.notWaitingForMe}
                                            onChange={this.handleChange('notWaitingForMe')}
                                            value="notWaitingForMe"
                                            color="primary"
                                        />
                                    }
                                    label="Afficher uniquement les projets que je n'ai pas encore traité"
                                />
                            </GridItem>
                        </GridContainer>

                        {loadedContent}
                    </CardBody>
                </Card>

                {(this.props.user.user.EPGE || this.props.user.user.admin) &&
                    <Card>
                        <CardHeader color="primary">
                            <h4 className={classes.cardTitleWhite}>Téléchargement</h4>
                            <p className={classes.cardCategoryWhite}>
                                Téléchargements disponibles
                            </p>
                        </CardHeader>
                        <CardBody>
                            <a href={api.host + ":" + api.port + "/api/pdf/all?token=" + AuthService.getToken()}>
                                <Button size="sm" color="info">
                                    Télécharger les projets validés au format PDF
                                </Button>
                            </a>
                            <a href={api.host + ":" + api.port + "/api/project/csv?token=" + AuthService.getToken()}>
                                <Button size="sm" color="info">
                                    Télécharger les projets validés au format CSV
                                </Button>
                            </a>
                            <a href={api.host + ":" + api.port + "/api/project/csv/full?token=" + AuthService.getToken()}>
                                <Button size="sm" color="info">
                                    Télécharger tous les projets au format CSV
                                </Button>
                            </a>
                            <a href={api.host + ":" + api.port + "/api/project/student?token=" + AuthService.getToken()}>
                                <Button size="sm" color="info">
                                    Télécharger les projets zippés
                                </Button>
                            </a>
                            <a href={api.host + ":" + api.port + "/api/pdf/regenerateAll?token=" + AuthService.getToken()}>
                                <Button size="sm" color="info">
                                    Regénérer tous les pdfs (attention, ne cliquer qu'une fois)
                                </Button>
                            </a>
                        </CardBody>
                    </Card>
                }
            </GridItem>
        </GridContainer>);
    }
}

export default withSnackbar(withUser(withStyles(styles)(ProjectList)));

const applyFilters = (filters, datas) => {
    return filters.reduce((acc, f) => acc.filter(f), datas)
}