import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import OutlinedInput from "@material-ui/core/OutlinedInput";
import Chip from '@material-ui/core/Chip';
import  lightpink, { yellow }  from '@material-ui/core/colors';
import SignupLogin from './SignupLoginButtons';
import './SignupLoginButtons.css';
import purple from "@material-ui/core/colors/purple";

const styles = theme => ({
  root: {
    display: 'flex',
    justifyContent: 'center',
    flexWrap: 'no-wrap',
    marginTop:20,
    marginLeft:15,
  },
  chip: {
    margin: theme.spacing.unit,
    borderColor: 'pink',
    paddingLeft: 20,
    paddingRight:20,
    fontSize:17,
    fontFamily: 'Montserrat',
    fontWeight: 600,
    color:'navy',
    textTransform:'none',  
},
});

function OutlinedChips(props) {
  const { classes } = props;
  return (
    <div className={classes.root}>
     <Chip
        label="Home"
        className={classes.chip}
        // component="a"
        href="#chip"
        clickable
        variant="outlined"
      />
      
     <Chip
        label="Designs"
        className={classes.chip}
        // component="a"
        href="#chip"
        clickable
        variant="outlined"
      />
       <Chip
        label="Pricing"
        className={classes.chip}
        // component="a"
        href="#chip"
        clickable
        variant="outlined"
      />
    </div>
    );
  }
  
  OutlinedChips.propTypes = {
    classes: PropTypes.object.isRequired,
  };
  
  export default withStyles(styles)(OutlinedChips);